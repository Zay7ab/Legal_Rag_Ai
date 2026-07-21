"""
Verify every query expansion points at language the corpus actually contains.

An expansion mapping "khula" to words no statute uses is worse than no expansion:
it fires on every khula question and adds noise to all of them. So each mapping's
statutory terms are checked against the corpus text.

Usage:  python scripts/verify_expansions.py
Exit 1 if any expansion references vocabulary that appears nowhere.
"""
from __future__ import annotations
import sys, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.query_expansion import EXPANSIONS

LAWS = Path(__file__).resolve().parent.parent / "data" / "laws"
# words too common to prove anything
STOP = {"of","the","a","an","and","or","in","on","to","for","by","is","be","not","person","before"}


def main() -> int:
    corpus = " ".join(
        p.read_text(encoding="utf-8", errors="ignore").lower()
        for p in LAWS.glob("*.txt")
    )
    if not corpus:
        print("No law files. Run: python scripts/fetch_laws.py")
        return 1

    bad, ok = [], 0
    print(f"{'EVERYDAY TERM':<24}{'STATUTORY TERMS FOUND IN CORPUS'}")
    print("-" * 78)
    for term, statutory in sorted(EXPANSIONS.items()):
        words = [w for w in statutory.lower().split() if w not in STOP and len(w) > 2]
        hits = [w for w in words if w in corpus]
        miss = [w for w in words if w not in corpus]
        if not hits:
            bad.append((term, statutory, "NONE of its terms appear in any statute"))
            print(f"  {term:<22}NONE FOUND  -> {statutory[:40]}")
        else:
            ok += 1
            note = f"  (missing: {', '.join(miss[:3])})" if miss else ""
            print(f"  {term:<22}{len(hits)}/{len(words)} present{note}")

    print()
    print(f"  expansions grounded in the corpus : {ok}/{len(EXPANSIONS)}")
    if bad:
        print(f"\n  {len(bad)} expansion(s) point at vocabulary no statute uses:")
        for t, s_, why in bad:
            print(f"    {t}: {why}")
        print("  Fix the mapping or fetch the statute. A wrong expansion adds noise")
        print("  to every query that trips it.")
        return 1
    print("\n  Every expansion points at language that exists in the corpus.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
