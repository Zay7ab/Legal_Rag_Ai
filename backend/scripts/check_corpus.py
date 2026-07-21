"""
Corpus coverage check.

The RAG chatbot is only as good as data/laws/. When a statute is present only
as a handful of excerpts, retrieval finds nothing for most queries and the bot
answers "I don't have specific information..." -- which reads as broken.

This script quantifies that instead of leaving it to be discovered in a demo.
It does NOT invent legal text: it measures what is actually on disk against the
real size of each statute and tells you what to go and source.

Usage:  python scripts/check_corpus.py
Exit codes: 0 = adequate, 1 = gaps found (usable in CI).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

LAWS_DIR = Path(__file__).resolve().parent.parent / "data" / "laws"

# Ground truth about each statute, so "how complete is this?" is answerable.
# section_count = the real number of sections/articles in the enacted law.
EXPECTED = {
    # sections = the nominal numbered range in the enacted statute. Real files
    # can exceed it: decades of amendments insert sections (302, 302A, 337A-337Z,
    # 489F...). So >=90% is treated as complete rather than flagged as a bug.
    "ppc": {
        "label": "Pakistan Penal Code 1860",
        "sections": 511,
        "source": "http://www.pakistancode.gov.pk — Act XLV of 1860",
    },
    "constitution_1973": {
        "label": "Constitution of Pakistan 1973",
        "sections": 280,          # Articles
        "source": "https://pakistancode.gov.pk — official consolidated text",
    },
    "crpc": {
        "label": "Code of Criminal Procedure 1898",
        "sections": 565,
        "source": "http://www.pakistancode.gov.pk — Act V of 1898",
    },
    "cpc_1908": {
        "label": "Code of Civil Procedure 1908",
        "sections": 158,          # numbered sections; Orders/Rules are separate
        "source": "http://www.pakistancode.gov.pk — Act V of 1908",
    },
    "qanun_e_shahadat": {
        "label": "Qanun-e-Shahadat Order 1984",
        "sections": 166,
        "source": "http://www.pakistancode.gov.pk — P.O. X of 1984",
    },
    "mflo_1961": {
        "label": "Muslim Family Laws Ordinance 1961",
        "sections": 14,
        "source": "http://www.pakistancode.gov.pk — Ordinance VIII of 1961",
    },
    "peca_2016": {
        "label": "Prevention of Electronic Crimes Act 2016",
        "sections": 57,
        "source": "http://www.pakistancode.gov.pk — Act XL of 2016",
    },
    "industrial_relations_2012": {
        "label": "Industrial Relations Act 2012",
        "sections": 89,
        "source": "http://www.pakistancode.gov.pk — Act X of 2012",
    },
    "minimum_wages_1961": {
        "label": "Minimum Wages Ordinance 1961",
        "sections": 15,
        "source": "http://www.pakistancode.gov.pk — Ordinance XXXIX of 1961",
    },
    "eobi_1976": {
        "label": "Employees' Old-Age Benefits Act 1976",
        "sections": 49,
        "source": "http://www.pakistancode.gov.pk — Act XIV of 1976",
    },
    "harassment_2010": {
        "label": "Protection Against Harassment of Women at the Workplace Act 2010",
        "sections": 11,
        "source": "http://www.pakistancode.gov.pk — Act IV of 2010",
    },
    "dmma_1939": {
        "label": "Dissolution of Muslim Marriages Act 1939",
        "sections": 5,
        "source": "http://www.pakistancode.gov.pk — Act VIII of 1939",
    },
    "punjab_rent_2009": {
        "label": "Punjab Rented Premises Act 2009",
        "sections": 33,
        "source": "http://punjablaws.gov.pk (provincial — not on Pakistan Code)",
    },
}

COMPLETE_AT = 0.90   # >=90% of the nominal range is a complete statute

SECTION_RE = re.compile(r"^\s*(?:Section|Article)\s+([0-9]+[A-Za-z\-]*)", re.M | re.I)


def analyse(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="ignore")
    found = {m.group(1).upper() for m in SECTION_RE.finditer(text)}
    return {"bytes": len(text.encode()), "sections_found": len(found)}


def main() -> int:
    if not LAWS_DIR.exists():
        print(f"ERROR: {LAWS_DIR} does not exist.")
        return 1

    files = sorted(p for p in LAWS_DIR.iterdir() if p.suffix.lower() in (".txt", ".pdf"))
    if not files:
        print(f"ERROR: no law files in {LAWS_DIR}. RAG will return nothing.")
        return 1

    print(f"Corpus: {LAWS_DIR}\n")
    header = f"{'FILE':<26}{'SIZE':>9}{'SECTIONS':>10}{'EXPECTED':>10}{'COVERAGE':>10}"
    print(header)
    print("-" * len(header))

    gaps = []
    for f in files:
        key = f.stem.lower()
        meta = EXPECTED.get(key)
        if f.suffix.lower() == ".pdf":
            print(f"{f.name:<26}{f.stat().st_size//1024:>7}KB{'(pdf)':>10}{'-':>10}{'-':>10}")
            continue
        a = analyse(f)
        if meta:
            ratio = a["sections_found"] / meta["sections"]
            shown = "full" if ratio >= 1 else f"{ratio*100:.1f}%"
            print(f"{f.name:<26}{a['bytes']//1024:>7}KB{a['sections_found']:>10}"
                  f"{meta['sections']:>10}{shown:>10}")
            if ratio < COMPLETE_AT:
                gaps.append((f.name, meta, a, ratio * 100))
        else:
            print(f"{f.name:<26}{a['bytes']//1024:>7}KB{a['sections_found']:>10}{'?':>10}{'?':>10}")

    if not gaps:
        print("\nAll statutes present in full. Run scripts/ingest_laws.py to (re)build the index.")
        return 0

    print(f"\n{'='*62}\n{len(gaps)} statute(s) still incomplete.\n{'='*62}")
    print("Effect: any query about a section that isn't present retrieves nothing,")
    print("and the chatbot replies \"I don't have specific information about this\".")
    print("Fix: python scripts/fetch_laws.py   (pulls official text from the")
    print("Pakistan Code), then python scripts/ingest_laws.py to rebuild the index.\n")
    for name, meta, a, pct in gaps:
        print(f"  {name}")
        print(f"    {meta['label']}: {a['sections_found']}/{meta['sections']} sections ({pct:.1f}%)")
        print(f"    source: {meta['source']}")
    print("\nNOTE: do not synthesise or paraphrase statute text to fill these gaps.")
    print("Wrong legal text is worse than a documented gap.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
