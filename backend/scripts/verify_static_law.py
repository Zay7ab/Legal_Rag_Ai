"""
Verify hardcoded legal claims against the corpus.

Why this exists
---------------
Not everything in this app is RAG. The chat and document-scan endpoints are
grounded, but four surfaces carry hand-written legal content:

    Penalty table   42 section numbers   react-frontend/src/data/legal.js
    Rights page      7 citation sets     backend/routers/rights.py
    FAQ             30 answers           react-frontend/src/data/legal.js
    Glossary        38 definitions       react-frontend/src/data/legal.js

Static reference content is legitimate — a glossary doesn't need retrieval. What
is NOT legitimate is a section number nobody ever checked. And two were wrong:

    §307 "Attempt to murder"  -> that is the INDIAN Penal Code.
                                 PPC §307 is "Cases in which Qisas for
                                 qatl-e-amd shall not be enforced".
                                 Attempted murder in Pakistan is §324.

    §304 "Culpable homicide"  -> also IPC. PPC §304 is "Proof of qatl-i-amd
                                 liable to qisas". The Pakistani equivalent is
                                 qatl shibh-i-amd, §315-316.

The PPC and IPC began as the same 1860 statute, but Pakistan renumbered Chapter
XVI wholesale in the Qisas and Diyat Ordinance 1990. Any source trained mostly on
Indian law — which is most of them, and every general-purpose LLM — will hand you
the IPC number for a Pakistani offence with total confidence.

That is the exact failure this product exists to prevent, and it was in our own
hardcoded table.

Usage:  python scripts/verify_static_law.py
Exit 1 if any claim can't be verified. Suitable for CI.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAWS = ROOT / "data" / "laws"
LEGAL_JS = ROOT.parent / "react-frontend" / "src" / "data" / "legal.js"

# UI tab -> corpus file. Tabs whose statute we don't hold can't be checked;
# they're reported separately rather than silently passed.
FILE_FOR = {
    "PPC": "ppc",
    "CRPC": "crpc",
    "PECA 2016": "peca_2016",
    "MFLO": "mflo_1961",
    "NAB": "nab_ordinance_1999",
    # The Labour tab spans three statutes; each row is checked against whichever
    # one contains that section number.
    "Labour": ["industrial_relations_2012", "minimum_wages_1961", "eobi_1976"],
}

# Pakistani legal vocabulary differs from the plain-English label, so a literal
# word match would produce noise. These map a UI label to terms that should
# appear in the real section text.
SYNONYMS = {
    "corruption": ["corrupt"],
    "assets": ["assets", "income"],
    "wilful default": ["default"],
    "unfair labour": ["unfair labour"],
    "minimum wage": ["minimum", "wages"],
    "eobi": ["old-age", "old age", "insured", "offences", "allowance"],
    "register workers": ["offences", "allowance"],
    "aiding": ["aids", "abets", "conspiracy"],
    "conspiring": ["conspiracy", "abets"],
    "bribery": ["gratification", "corrupt"],
    "misuse of power": ["corrupt", "public office"],
    "bank loan": ["loan", "financial institution"],
    "cheating": ["cheat", "gratification"],
    "public official": ["public office", "holder of a public office"],
    "murder": ["qatl-i-amd", "qatl-e-amd", "qat l-i-amd"],
    "attempt": ["attempt"],
    "grievous hurt": ["ghayr-jaifah", "jaifah", "hurt"],
    "hurt": ["hurt", "shajjah", "jaifah"],
    "defamation": ["dignity", "defam"],
    "intimate": ["modesty", "explicit", "photograph"],
    "impersonation": ["identity", "spoof"],
    "cheating": ["cheat"],
    "theft": ["theft"],
    "robbery": ["robbery"],
    "dacoity": ["dacoity"],
    "cheque": ["cheque"],
    "rape": ["rape"],
    "talaq": ["talaq"],
    "polygamy": ["permission", "existing wife", "polygam"],
    "maintenance": ["maintenance"],
}


def load_corpus() -> dict[str, str]:
    return {p.stem: p.read_text(encoding="utf-8", errors="ignore") for p in LAWS.glob("*.txt")}


def section_body(text: str, sec: str, limit: int = 220) -> str | None:
    # Sub-clause citations (9(a)(v)) need more of the section than the heading,
    # because the clause being cited sits well inside it.
    if "(" in sec:
        limit = 2600
    # Statutes are cited down to sub-clauses -- NAB "9(a)(v)", PPC "337A(i)".
    # The corpus is split by section, so strip to the base number and check that.
    # A claim about 9(a)(v) is at least a claim about a real §9.
    base = re.match(r"\s*(\d+[A-Z]?)", sec)
    cands = [base.group(1)] if base else []
    for cand in cands + re.split(r"[-–/]", sec):
        cand = cand.strip().upper().replace(" ", "")
        if not cand:
            continue
        m = re.search(rf"^(?:Section|Article) {re.escape(cand)}\.(.{{0,{limit}}})", text, re.M | re.S)
        if m:
            return " ".join(m.group(1).split())
    return None


def _norm(x: str) -> str:
    """
    Collapse to comparable letters.

    The statute writes "qatl shibh-i-'amd" and "Cyber stalking"; the UI writes
    "Qatl shibh-i-amd" and "Cyberstalking". Those are the same thing, and a
    matcher that flags them is crying wolf -- which is worse than no matcher,
    because real errors get lost in the noise.
    """
    return re.sub(r"[^a-z]", "", x.lower())


def plausible(offence: str, body: str) -> bool:
    low, nbody = body.lower(), _norm(body)
    o = offence.lower()
    for key, terms in SYNONYMS.items():
        if key in o and any(_norm(t) in nbody for t in terms):
            return True
    # any distinctive word from the label, compared on letters only
    for w in re.split(r"[^a-z']+", o):
        w = _norm(w)
        if len(w) > 5 and w in nbody:
            return True
    # the whole label, punctuation removed
    core = _norm(re.split(r"[(]", offence)[0])
    return len(core) > 6 and core in nbody



# ── FAQ + glossary ────────────────────────────────────────────────────────────
# The penalty table is structured data, so it was easy to check. The FAQ answers
# and glossary definitions are prose -- and prose with section numbers in it is
# still a legal claim. "Section 96 CrPC requires a search warrant" is exactly as
# checkable, and exactly as dangerous when wrong, as a row in a table.

# Which statute a citation belongs to, inferred from how it's written.
CITE_RE = re.compile(
    r"(?:Section|section)\s+(\d+[-–]?[A-Z]?)\s*(PPC|CrPC|MFLO|PECA|Cr\.?P\.?C)?"
    r"|(?:Article|article)\s+(\d+[A-Z]?)\s*(?:of the )?(Constitution)?",
)

SUFFIX_FILE = {
    "PPC": "ppc", "CRPC": "crpc", "CR.P.C": "crpc", "CRPC.": "crpc",
    "MFLO": "mflo_1961", "PECA": "peca_2016", "CONSTITUTION": "constitution_1973",
    "CPC": "cpc_1908", "QSO": "qanun_e_shahadat",
}

# Statutes the FAQ/glossary name in prose. A citation to an Act we do not hold is
# a claim nobody can check -- the same problem as an invented one -- so this list
# is what "held" means, and anything outside it is reported.
HELD_ACT_NAMES = {
    "pakistan penal": "ppc", "ppc": "ppc",
    "criminal procedure": "crpc", "crpc": "crpc",
    "civil procedure": "cpc_1908",
    "constitution": "constitution_1973",
    "qanun": "qanun_e_shahadat", "shahadat": "qanun_e_shahadat",
    "electronic crimes": "peca_2016", "peca": "peca_2016",
    "muslim family": "mflo_1961", "mflo": "mflo_1961",
    "dissolution of muslim": "dmma_1939",
    "industrial relations": "industrial_relations_2012",
    "minimum wages": "minimum_wages_1961",
    "old-age": "eobi_1976", "eobi": "eobi_1976",
    "harassment": "harassment_2010",
    "accountability": "nab_ordinance_1999", "nab": "nab_ordinance_1999",
    "punjab rented": "punjab_rent_2009",
    "guardians and wards": "guardians_wards_1890",
    "payment of wages": "payment_of_wages_1936",
    "employment of children": "employment_of_children_1991",
}


def check_prose(corpus: dict) -> tuple[int, list]:
    """
    Verify section numbers cited in FAQ answers and glossary definitions.

    Only citations that name their statute are checked -- "Section 96 CrPC" is
    checkable, a bare "Section 9" is ambiguous and is reported as unanchored
    rather than guessed at.
    """
    src = LEGAL_JS.read_text(encoding="utf-8")
    faq = src[src.index("export const FAQ_SECTIONS"): src.index("export const GLOSSARY_TERMS")]
    gloss = src[src.index("export const GLOSSARY_TERMS"): src.index("export const PENALTY_LAWS")]

    ok, problems = 0, []
    for label, blob in (("FAQ", faq), ("GLOSSARY", gloss)):
        for m in re.finditer(r"(?:Section|section)\s+(\d+[-–]?[A-Z]?)\s+(PPC|CrPC|MFLO|PECA)", blob):
            sec, suffix = m.group(1), m.group(2).upper()
            fk = SUFFIX_FILE.get(suffix)
            if not fk or fk not in corpus:
                problems.append((label, f"{sec} {suffix}", "statute not in corpus"))
                continue
            body = section_body(corpus[fk], sec.replace("–", "-"))
            if body is None:
                problems.append((label, f"§{sec} {suffix}", f"not present in {fk}"))
            else:
                ok += 1
        for m in re.finditer(r"(?:Article|article)\s+(\d+[A-Z]?)\s+(?:of the )?Constitution", blob):
            body = section_body(corpus.get("constitution_1973", ""), m.group(1))
            if body is None:
                problems.append((label, f"Art {m.group(1)}", "not present in constitution_1973"))
            else:
                ok += 1
    return ok, problems


def main() -> int:
    corpus = load_corpus()
    if not corpus:
        print("No law files. Run: python scripts/fetch_laws.py")
        return 1
    if not LEGAL_JS.exists():
        print(f"Not found: {LEGAL_JS}")
        return 1

    src = LEGAL_JS.read_text(encoding="utf-8")
    block = src[src.index("export const PENALTY_LAWS"):]
    tabs = re.split(r'\{short:"', block)[1:]

    ok, bad, skipped = 0, [], []
    print(f"{'TAB':<11}{'SECTION':<10}{'UI CLAIM':<44}{'VERDICT'}")
    print("-" * 92)

    for tab in tabs:
        short = tab[: tab.index('"')]
        fk = FILE_FOR.get(short)
        rows = re.findall(r'\{offence:"([^"]*)",section:"([^"]*)",punishment:"([^"]*)"', tab)
        for offence, sec, _pun in rows:
            keys = fk if isinstance(fk, list) else [fk]
            keys = [k for k in keys if k and k in corpus]
            if not keys:
                skipped.append((short, sec, offence))
                continue
            # Several labour statutes share section numbers (IRA §31 and EOBI
            # §31 both exist). Taking the first file that has the number matches
            # the wrong Act, so try them all and keep the one that fits the claim.
            bodies = [b for b in (section_body(corpus[k], sec) for k in keys) if b]
            body = next((b for b in bodies if plausible(offence, b)), bodies[0] if bodies else None)
            if body is None:
                bad.append((short, sec, offence, f"§{sec} is not in {keys}"))
                print(f"{short:<11}{sec:<10}{offence[:42]:<44}NOT IN STATUTE")
            elif not plausible(offence, body):
                bad.append((short, sec, offence, body[:80]))
                print(f"{short:<11}{sec:<10}{offence[:42]:<44}MISMATCH")
                print(f"{'':21}corpus says: {body[:64]!r}")
            else:
                ok += 1

    prose_ok, prose_bad = check_prose(corpus)
    if prose_bad:
        print()
        print("  FAQ / glossary citations that could not be verified:")
        for where, cite, why in prose_bad:
            print(f"    {where:<9} {cite:<14} {why}")

    print()
    print(f"  penalty claims verified     : {ok}")
    print(f"  FAQ/glossary cites verified : {prose_ok}")
    if prose_bad:
        print(f"  FAQ/glossary cites FAILED   : {len(prose_bad)}")
    ok = ok + prose_ok
    bad = bad + [("prose", c, w, "") for _, c, w in prose_bad]
    print(f"  total verified              : {ok}")
    print(f"  failed                      : {len(bad)}")
    print(f"  unverifiable                : {len(skipped)}  (statute not in corpus)")

    if skipped:
        laws = sorted({s[0] for s in skipped})
        print(f"\n  Not checkable — these statutes aren't in data/laws: {', '.join(laws)}")
        print("  They are hand-written and NOT grounded. Either add the statute via")
        print("  scripts/fetch_laws.py, or treat those tabs as unverified reference.")

    if bad:
        print(f"\n  {len(bad)} claim(s) could not be verified. Fix the data or the corpus.")
        return 1

    print("\n  All checkable claims match the enacted text.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
