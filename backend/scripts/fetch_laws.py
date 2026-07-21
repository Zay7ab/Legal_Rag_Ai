"""
Fetch official statute texts from the Pakistan Code (Ministry of Law and Justice).

Why this exists
---------------
The bundled law files were hand-typed excerpts — PPC had 9 of 511 sections, so
RAG retrieved nothing for almost every real question. The fix is real statute
text, and the only acceptable source is the official one. Statute text is a
government edict: it is the law, published by the state for citizens to read.

What it does
------------
  1. walks the alphabetical index at pakistancode.gov.pk
  2. finds each wanted Act by title
  3. follows its page to the official PDF
  4. extracts the text and writes backend/data/laws/<name>.txt

Deliberately conservative: one request at a time, a real delay between them,
and it stops on the first sign the site doesn't want to serve us. This runs
occasionally to refresh a corpus, not in a loop.

Nothing here generates or paraphrases legal text. If a fetch fails, the file is
not written — a missing statute is safe, an invented one is not.

Usage
-----
    python scripts/fetch_laws.py            # fetch the default set
    python scripts/fetch_laws.py --list     # show what's available, fetch nothing
    python scripts/fetch_laws.py ppc crpc   # fetch specific keys
"""

from __future__ import annotations

import re
import sys
import time
import html
import argparse
import urllib.request
import urllib.error
from pathlib import Path

BASE = "https://www.pakistancode.gov.pk/english/"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
LAWS_DIR = Path(__file__).resolve().parent.parent / "data" / "laws"
DELAY = 1.5          # seconds between requests — be a good citizen
MAX_INDEX_PAGES = 8

# key -> dict(file, letter, pattern, label, url)
#   letter/pattern -> found by walking the alphabetical index
#   url            -> a known direct PDF (used when an act isn't in that index)
#   label          -> "Section" for Acts/Ordinances, "Article" for the Constitution
WANTED = {
    "ppc":      dict(file="ppc.txt",                letter="P", pattern=r"pakistan penal code"),
    "crpc":     dict(file="crpc.txt",               letter="C", pattern=r"code of criminal procedure",
                     stop_at=r"^FORMS$"),        # Schedule V is blank court forms
    "peca":     dict(file="peca_2016.txt",          letter="P", pattern=r"prevention of electronic crimes"),
    "mflo":     dict(file="mflo_1961.txt",          letter="M", pattern=r"muslim family laws ordinance"),
    # Khula (divorce initiated by the wife) lives HERE, not in the MFLO — which
    # only covers talaq. "Khula ka procedure kya hai?" is one of the app's own
    # homepage sample questions and retrieved nothing until this was added.
    "dmma":     dict(file="dmma_1939.txt",          letter="D", pattern=r"dissolution of muslim marriages"),

    # Added because the Rights page cited all of these and the corpus held none
    # of them. A citation to a statute we do not have is a claim we cannot check,
    # which is the same problem as an invented one.
    "ira":      dict(file="industrial_relations_2012.txt", letter="I", pattern=r"industrial relations act"),
    "factories":dict(file="factories_act_1934.txt", letter="F", pattern=r"^the factories act"),
    "minwage":  dict(file="minimum_wages_1961.txt", letter="M", pattern=r"minimum wages ordinance"),
    "eobi":     dict(file="eobi_1976.txt",          letter="E", pattern=r"employees.? old-?age benefits"),
    "harass":   dict(file="harassment_2010.txt",    letter="P", pattern=r"protection against harassment of women"),
    "women":    dict(file="women_protection_2006.txt", letter="P", pattern=r"protection of women"),
    "nab":      dict(file="nab_ordinance_1999.txt", letter="N", pattern=r"national accountability"),
    "consumer": dict(file="consumer_protection.txt", letter="C", pattern=r"consumer protection"),

    # Cited by the FAQ / glossary. An uncheckable citation in prose is the same
    # problem as one in a table.
    "guardians": dict(file="guardians_wards_1890.txt", letter="G", pattern=r"guardians and wards"),
    "wages":     dict(file="payment_of_wages_1936.txt", letter="P", pattern=r"payment of wages act"),
    "limitation":dict(file="limitation_act_1908.txt", letter="L", pattern=r"^the limitation act"),
    "childemp":  dict(file="employment_of_children_1991.txt", letter="E", pattern=r"employment of children"),
    "familycourts": dict(file="family_courts_1964.txt", letter="W", pattern=r"family courts act"),
    "shariat":   dict(file="shariat_application_1962.txt", letter="M", pattern=r"personal law.*shariat.*application"),

    # Cited by the document templates. A generated Partnership Deed that invokes
    # the Partnership Act 1932 is making a legal claim; we should hold the Act.
    "partnership": dict(file="partnership_act_1932.txt", letter="P", pattern=r"partnership act"),
    "poa":       dict(file="powers_of_attorney_1882.txt", letter="P", pattern=r"powers?-?of-?attorney"),
    "tpa":       dict(file="transfer_of_property_1882.txt", letter="T", pattern=r"transfer of property act"),
    "factories2":dict(file="factories_act_1934.txt", letter="F", pattern=r"factories act"),
    "cpc":      dict(file="cpc_1908.txt",           letter="C", pattern=r"code of civil procedure", dedupe=False,
                     stop_at=r"^APPENDIX A"),    # Appendices A-H are pleading/decree forms
    "qso":      dict(file="qanun_e_shahadat.txt",   letter="Q", pattern=r"qanun-?e-?shahadat", label="Article"),
    "contract": dict(file="contract_act_1872.txt",  letter="C", pattern=r"^the contract act"),
    "ata":      dict(file="anti_terrorism_1997.txt",letter="A", pattern=r"anti-?terrorism act"),
    # The Constitution is featured on the homepage, not in the A-Z index, so it
    # is pinned by URL. It is numbered by Article, not Section.
    "constitution": dict(
        file="constitution_1973.txt",
        label="Article",
        title="The Constitution of the Islamic Republic of Pakistan",
        url="https://pakistancode.gov.pk/pdffiles/administrator9d8e2ecc414c6d3371ac41114b61a2c4.pdf",
    ),
}


# Titles in the index that mean "this is not the law any more".
# The index lists repealed Acts alongside live ones, and the first match for
# "industrial relations act" is the 2008 Act — repealed by Act X of 2012.
# Shipping a repealed statute as current law is exactly the failure this whole
# corpus exercise exists to prevent, so it is refused rather than ranked lower.
DEAD_LAW = re.compile(r"\brepeal|\bomitted\b|\bsubstituted by\b", re.I)


def fetch(url: str, binary: bool = False, referer: str = BASE):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": referer})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "ignore")


def strip_tags(s: str) -> str:
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)))


def index_page(letter: str, page: int):
    """Return [(title, href)] of acts listed under `letter` on `page`."""
    s = fetch(f"{BASE}LGu0xAD?alp={letter}&page={page}&action=active")
    out = []
    for m in re.finditer(r'<a[^>]*href="([^"]*UY2Fqa[^"]*)"[^>]*>(.*?)</a>', s, re.S | re.I):
        title = re.sub(r"\s+", " ", strip_tags(m.group(2))).strip()
        if title and len(title) > 6 and title.lower() != "view":
            out.append((title, m.group(1)))
    return out


def find_act(letter: str, pattern: str):
    """Walk the index under `letter` until an act title matches `pattern`."""
    rx = re.compile(pattern, re.I)
    seen = set()
    for page in range(1, MAX_INDEX_PAGES + 1):
        try:
            rows = index_page(letter, page)
        except Exception as e:
            print(f"    index {letter}/{page} failed: {e}")
            return None
        fresh = [r for r in rows if r[0] not in seen]
        if not fresh:
            return None
        for title, href in fresh:
            seen.add(title)
            if not rx.search(title):
                continue
            if DEAD_LAW.search(title):
                print(f"    skipping repealed: {title}")
                continue
            return title, href
        time.sleep(DELAY)
    return None


def pdf_url_for(act_href: str) -> str | None:
    url = act_href if act_href.startswith("http") else BASE + act_href.lstrip("/")
    s = fetch(url)
    links = re.findall(r'href="([^"]*pdffiles[^"]*\.pdf)"', s)
    return links[0] if links else None


def pdf_to_text(data: bytes, tmp: Path) -> str:
    from pypdf import PdfReader
    tmp.write_bytes(data)
    reader = PdfReader(str(tmp))
    return "\n".join(p.extract_text() or "" for p in reader.pages)


# The Pakistan Code PDFs open with a full table of contents, which extracts as
# thousands of "Section N. <title>" lines carrying no provision text. Left in,
# every real section gets a near-identical twin in the vector store and
# retrieval happily returns the contents stub instead of the actual law.
#
# Filtering on body length alone is not enough: some TOC titles run past 60
# characters ("Production of documents which another person, having possession,
# could refuse to produce") and survive. Deduplicating by section number and
# keeping the longest body is exact, and independent of how long a title is.
MIN_SECTION_BODY = 40


def normalise_text(text: str) -> str:
    """Repair PDF extraction artefacts. Never alters legal wording."""
    # Soft hyphens are invisible but real: "qatl\u00adi\u00adamd" does not match a
    # search for "qatl-i-amd". These PDFs are full of them (700+ in the PPC).
    text = text.replace("\u00ad", "-").replace("\u2011", "-")
    text = text.replace("\u2044", "/").replace("\xa0", " ")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    # U+037E is the GREEK QUESTION MARK. It is visually identical to ";" and the
    # Pakistan Code PDFs are full of it (330 occurrences in the PPC alone).
    # Left alone it is a homoglyph landmine: a search for ";" never matches, and
    # the stored text is quietly not what it appears to be.
    text = text.replace("\u037e", ";")
    # A short run of underscores is a mangled dash; a long run is a fill-in
    # blank in a schedule or form, which must be left alone.
    text = re.sub(r"_{2,4}", "\u2014", text)
    text = re.sub(r"Page \d+ of \d+", "", text)          # page furniture
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def strip_toc(text: str, label: str = "Section", dedupe: bool = True) -> tuple[str, int]:
    """
    Drop table-of-contents entries.

    Splits on section boundaries, then for each section NUMBER keeps only the
    longest occurrence — the real provision always carries more text than its
    contents-page twin. Also drops bodies too short to be a provision at all.

    dedupe=False for statutes whose numbering legitimately repeats. The CPC's
    First Schedule numbers Rules *within* Orders (Order I r.1, Order II r.1 ...),
    so keeping one "Section 1." per number would delete most of the Schedule —
    it cost 70% of the text before this flag existed. Those acts keep some
    contents noise, which is the lesser harm.
    Returns (text, dropped_count).
    """
    if not dedupe:
        parts = re.split(rf"\n(?={label} \d+[A-Z]?\.)", text)
        kept, dropped = [], 0
        for part in parts:
            m = re.match(rf"{label} \d+[A-Z]?\.\s*(.*)", part, re.S)
            if m and len(m.group(1).strip()) < MIN_SECTION_BODY:
                dropped += 1
                continue
            kept.append(part)
        return "\n".join(kept), dropped

    parts = re.split(rf"\n(?={label} \d+[A-Z]?\.)", text)
    if len(parts) < 3:
        return text, 0

    best: dict[str, tuple[int, int]] = {}   # number -> (index, length)
    order: list[tuple[int, str]] = []       # (index, part)
    dropped = 0

    for i, part in enumerate(parts):
        m = re.match(rf"{label} (\d+[A-Z]?)\.\s*(.*)", part, re.S)
        if not m:
            order.append((i, part))         # preamble / enacting formula
            continue
        num, body = m.group(1), m.group(2).strip()
        if len(body) < MIN_SECTION_BODY:
            dropped += 1
            continue
        prev = best.get(num)
        if prev is None or len(body) > prev[1]:
            best[num] = (i, len(body))

    keep_idx = {i for i, _ in best.values()}
    dropped += len([1 for i, p in enumerate(parts)
                    if re.match(rf"{label} \d+", p) and i not in keep_idx]) - dropped
    for i, part in enumerate(parts):
        if re.match(rf"{label} \d+[A-Z]?\.", part) and i in keep_idx:
            order.append((i, part))

    order.sort(key=lambda x: x[0])
    return "\n".join(p for _, p in order), dropped


def drop_forms(text: str, pattern: str) -> tuple[str, int]:
    """
    Cut a trailing appendix of blank forms.

    Why: the CrPC ships Schedule V (summonses, warrants, charge templates) and
    the CPC ships Appendices A-H (pleadings, decrees). They are fill-in-the-blank
    paperwork, not provisions — but they are dense with legal vocabulary, so they
    win retrieval. Asking "what is the punishment for murder?" returned a blank
    charge sheet reading "That you, on or about the day of ___, committed murder
    ... punishable under section 302" at L2 0.399, beating the actual PPC 302.
    Formally similar, practically useless.

    GUARD: cut on the LAST match, and only if it falls past the halfway mark.
    The marker also appears in the contents page — CPC's "APPENDIX A" sits at 1%
    of the file, and cutting there would silently delete 99% of the Code.
    """
    ms = [m.start() for m in re.finditer(pattern, text, re.M)]
    if not ms:
        return text, 0
    cut = ms[-1]
    if cut < len(text) * 0.5:
        # Only a contents-page hit. Leave the text alone rather than gut it.
        return text, 0
    return text[:cut], len(text) - cut


def clean(text: str, title: str, label: str = "Section", dedupe: bool = True,
          stop_at: str | None = None) -> tuple[str, int]:
    """Tidy PDF artefacts without touching the legal wording itself."""
    text = normalise_text(text)

    if stop_at:
        text, cut = drop_forms(text, stop_at)
        if cut:
            print(f"    dropped {cut:,} chars of trailing forms/appendices")

    # Mark section headers.
    #
    # This MUST anchor to the start of a line. The previous pattern
    # (?<!\n)\n?(\d+[A-Z]?\.\s+[A-Z]) had no digit guard, so in " 125. Votes on
    # account" it happily matched the "25." *inside* "125.", split the number,
    # and produced a bogus "Article 25". Deduplication then preferred that long
    # body over the real Article 25 — and the Constitution's equality clause was
    # silently replaced by a budget provision. In a tool people consult about
    # their rights, that is the worst class of bug there is: confidently wrong.
    #
    # A real header sits at the start of a line (after optional indent) and is
    # followed by a capital. Anchoring there makes the digit guard implicit.
    # The optional (?:\d+\[)? prefix matters more than it looks. The Pakistan Code
    # marks amended text with a superscript footnote and a bracket, so amended
    # provisions render as "1[10A. Right to fair trial" and
    # "4[489F. Dishonestly issuing a cheque". Without this, every amended section
    # is skipped — and amendments are precisely the modern, most-asked-about
    # provisions (489F dishonoured cheques, 10A fair trial, PECA's additions).
    text = re.sub(
        rf"(?m)^[ \t]*(?:\d+\[)?(\d+[A-Z]?)\.[ \t]+(?=[A-Z(])",
        rf"\n\n{label} \1. ",
        text,
    )
    text, dropped = strip_toc(text, label, dedupe)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return f"{title}\n{'=' * len(title)}\n\n{text.strip()}\n", dropped


def sections_in(text: str, label: str = "Section") -> int:
    return len(set(re.findall(rf"^{label}\s+(\d+[A-Za-z\-]*)", text, re.M)))


def grab(key: str) -> bool:
    spec = WANTED[key]
    out_name = spec["file"]
    label = spec.get("label", "Section")

    if spec.get("url"):
        title, pdf = spec["title"], spec["url"]
        print(f"\n[{key}] pinned PDF: {title}")
    else:
        letter, pattern = spec["letter"], spec["pattern"]
        print(f"\n[{key}] searching index '{letter}' for /{pattern}/")
        hit = find_act(letter, pattern)
        if not hit:
            print("    not found in index — skipped (nothing written)")
            return False
        title, href = hit
        print(f"    found: {title}")
        time.sleep(DELAY)
        try:
            pdf = pdf_url_for(href)
        except Exception as e:
            print(f"    act page failed: {e}")
            return False
        if not pdf:
            print("    no PDF on the act page — skipped")
            return False
    print(f"    pdf: {pdf.rsplit('/', 1)[-1]}")
    time.sleep(DELAY)

    try:
        data = fetch(pdf, binary=True)
    except Exception as e:
        print(f"    download failed: {e}")
        return False
    if not data.startswith(b"%PDF"):
        print("    not a PDF — skipped")
        return False

    tmp = LAWS_DIR / f".{key}.tmp.pdf"
    try:
        text = pdf_to_text(data, tmp)
    except Exception as e:
        print(f"    text extraction failed: {e}")
        return False
    finally:
        tmp.unlink(missing_ok=True)

    # A scanned PDF extracts to almost nothing. Better to write nothing than
    # to write a file that silently makes the corpus look complete.
    if len(text.strip()) < 2000:
        print(f"    only {len(text.strip())} chars extracted — likely scanned. Skipped.")
        return False

    cleaned, dropped = clean(text, title, label, spec.get("dedupe", True), spec.get("stop_at"))
    dest = LAWS_DIR / out_name
    dest.write_text(cleaned, encoding="utf-8")
    print(f"    wrote {dest.name}: {len(cleaned):,} chars, {sections_in(cleaned, label)} {label.lower()}s"
          f"{f' ({dropped} contents/stub entries dropped)' if dropped else ''}")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("keys", nargs="*", default=[], help=f"subset of: {', '.join(WANTED)}")
    ap.add_argument("--list", action="store_true", help="list available keys and exit")
    a = ap.parse_args()

    if a.list:
        for k, v in WANTED.items():
            how = "pinned URL" if v.get("url") else f"index '{v['letter']}' /{v['pattern']}/"
            print(f"  {k:13} -> {v['file']:26} ({how})")
        return 0

    try:
        import pypdf  # noqa: F401
    except ImportError:
        print("pypdf is required:  pip install pypdf")
        return 1

    keys = a.keys or list(WANTED)
    bad = [k for k in keys if k not in WANTED]
    if bad:
        print(f"unknown: {', '.join(bad)}. Try --list")
        return 1

    LAWS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Source : {BASE}")
    print(f"Target : {LAWS_DIR}")

    ok = [k for k in keys if grab(k)]

    print(f"\n{'=' * 58}\n{len(ok)}/{len(keys)} fetched: {', '.join(ok) or 'none'}")
    if ok:
        print("\nNext:")
        print("  python scripts/check_corpus.py     # confirm coverage")
        print("  python scripts/ingest_laws.py      # rebuild the FAISS index")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
