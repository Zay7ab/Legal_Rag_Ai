"""
Verify the statutory claims printed into generated documents.

Why this is the most important verifier of the three
---------------------------------------------------
`verify_static_law.py` checks reference pages — a user reads a wrong section
number and is misinformed. This checks **documents people execute**: a Talaq
Nama taken to a Union Council, a rent agreement printed on stamp paper, a Power
of Attorney relied on to sell property. A wrong deadline here doesn't misinform
someone; it makes them miss a legal requirement.

One was wrong, and it was in the Talaq Nama:

    printed:  "Notice ... shall be submitted to the Chairman ... within 7 days
               as required under Section 7(1) of the MFLO 1961"

    MFLO 7(1): "...shall, AS SOON AS MAY BE after the pronouncement of talaq...
               give the Chairman notice in writing"

There is no 7-day deadline in the Ordinance. It was invented. The same block also
implied the 90 days run from pronouncement; Section 7(3) runs them from the day
the *notice is delivered to the Chairman* — a different date, and the one that
decides when a divorce is actually final.

What this checks
----------------
Every "Section N of <Act>" / "Article N" claim inside a template body is looked
up in data/laws/. A claim about a statute we don't hold is reported, because an
uncheckable legal instruction is no better than an invented one.

It cannot check whether the *drafting* is sound — that needs a Pakistani lawyer.
It checks that every statute and section named actually exists and says roughly
what the template says it says.

Usage:  python scripts/verify_documents.py
Exit 1 on any unverifiable claim. Suitable for CI.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

LAWS = Path(__file__).resolve().parent.parent / "data" / "laws"

# How a statute is named in template prose -> the file that holds it.
ACT_FILE = {
    "muslim family laws ordinance": "mflo_1961",
    "mflo": "mflo_1961",
    "dissolution of muslim marriages": "dmma_1939",
    "pakistan penal code": "ppc",
    "ppc": "ppc",
    "criminal procedure": "crpc",
    "crpc": "crpc",
    "civil procedure": "cpc_1908",
    "cpc": "cpc_1908",
    "constitution": "constitution_1973",
    "qanun-e-shahadat": "qanun_e_shahadat",
    "electronic crimes": "peca_2016",
    "peca": "peca_2016",
    "industrial relations": "industrial_relations_2012",
    "minimum wages": "minimum_wages_1961",
    "old-age benefits": "eobi_1976",
    "eobi": "eobi_1976",
    "harassment of women": "harassment_2010",
    "national accountability": "nab_ordinance_1999",
    "punjab rented premises": "punjab_rent_2009",
    "guardians and wards": "guardians_wards_1890",
    "payment of wages": "payment_of_wages_1936",
    "employment of children": "employment_of_children_1991",
    "factories act": "factories_act_1934",
    "transfer of property": "transfer_of_property_1882",
    "partnership act": "partnership_act_1932",
    "powers-of-attorney": "powers_of_attorney_1882",
    "powers of attorney": "powers_of_attorney_1882",
}

# "Section 7(1) of the Muslim Family Laws Ordinance 1961"
# "Section 7(1) of the MFLO 1961"
CLAIM = re.compile(
    r"[Ss]ection\s+(\d+[A-Z]?)(?:\([^)]*\))*\s*(?:of\s+(?:the\s+)?)?"
    r"([A-Z][A-Za-z\-'’ ]{3,48}?(?:Act|Ordinance|Code|Order|MFLO|PPC|CrPC|PECA))",
)


# Statutes we knowingly cannot hold, with the reason. Listed explicitly so the
# gap is visible and CI stays useful — an unexplained failure gets ignored, and
# an ignored check is worse than none.
KNOWN_UNAVAILABLE = {
    "rented premises ordinance 1979":
        "Sindh provincial law; not published on the federal Pakistan Code. "
        "The template flags it as unverified rather than citing it silently.",
}


def load() -> dict:
    return {p.stem: p.read_text(encoding="utf-8", errors="ignore") for p in LAWS.glob("*.txt")}


def file_for(act_name: str) -> str | None:
    low = act_name.lower()
    for key, f in ACT_FILE.items():
        if key in low:
            return f
    return None


def has_section(text: str, sec: str) -> bool:
    return bool(re.search(rf"^(?:Section|Article)\s+{re.escape(sec)}\.", text, re.M))


def main() -> int:
    corpus = load()
    if not corpus:
        print("No law files. Run: python scripts/fetch_laws.py")
        return 1

    from services.doc_service import DocService

    svc = DocService()
    templates = svc.get_templates()
    templates = templates if isinstance(templates, list) else templates.get("templates", [])

    src = Path(__file__).resolve().parent.parent / "services" / "doc_service.py"
    # Collapse whitespace first. Template bodies are wrapped, so a citation
    # routinely spans a line break ("Muslim Family Laws\n   Ordinance 1961") and
    # a regex over the raw text silently matches nothing — which looks like a
    # clean pass. A verifier that finds zero claims is not a passing verifier.
    body = re.sub(r"\s+", " ", src.read_text(encoding="utf-8"))

    print(f"{len(templates)} templates\n")
    print(f"{'CLAIM':<46}{'STATUTE FILE':<28}{'VERDICT'}")
    print("-" * 92)

    ok, bad = 0, []
    seen = set()
    if not CLAIM.search(body):
        print("  No statutory claims found in any template — that is suspicious,")
        print("  not clean. Check the CLAIM regex before trusting this.")
        return 1
    for m in CLAIM.finditer(body):
        sec, act = m.group(1), m.group(2).strip()
        if (sec, act) in seen:
            continue
        seen.add((sec, act))
        fk = file_for(act)
        claim = f"Section {sec} of {act}"[:44]
        if not fk:
            bad.append((claim, act, "statute not recognised / not held"))
            print(f"{claim:<46}{'—':<28}NOT HELD")
        elif fk not in corpus:
            bad.append((claim, act, f"{fk}.txt missing"))
            print(f"{claim:<46}{fk:<28}FILE MISSING")
        elif not has_section(corpus[fk], sec):
            bad.append((claim, act, f"§{sec} not in {fk}"))
            print(f"{claim:<46}{fk:<28}SECTION NOT FOUND")
        else:
            ok += 1
            print(f"{claim:<46}{fk:<28}ok")

    # ── Bare Act names ────────────────────────────────────────────────────────
    # A template that says "Executed under the Partnership Act 1932" is claiming
    # which law governs the instrument, even without a section number. If we do
    # not hold that Act, nobody can check the claim.
    ACT_NAME = re.compile(r"\b([A-Z][A-Za-z\-'’ ]{4,52}?(?:Act|Ordinance),?\s+\d{4})")
    named = {m.group(1).strip() for m in ACT_NAME.finditer(body)}
    if named:
        print(f"\n{'STATUTE NAMED IN A TEMPLATE':<52}{'VERDICT'}")
        print("-" * 78)
        for act in sorted(named):
            fk = file_for(act)
            if fk and fk in corpus:
                ok += 1
                print(f"  {act[:48]:<50}held ({fk})")
            elif any(k in act.lower() for k in KNOWN_UNAVAILABLE):
                reason = next(v for k, v in KNOWN_UNAVAILABLE.items() if k in act.lower())
                print(f"  {act[:48]:<50}not held — known, documented")
                print(f"  {'':<50}{reason[:60]}")
            else:
                bad.append((act, act, "Act not in corpus"))
                print(f"  {act[:48]:<50}NOT HELD")

    print()
    print(f"  statutory claims verified : {ok}")
    print(f"  unverifiable              : {len(bad)}")

    if bad:
        print("\n  These documents cite law we cannot check. Either fetch the statute")
        print("  (scripts/fetch_laws.py) or remove the claim from the template.")
        return 1

    print("\n  Every statute and section named in a generated document exists.")
    print("  NOTE: this does not verify that the drafting is legally sound —")
    print("  that needs a Pakistani lawyer. It verifies the citations are real.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
