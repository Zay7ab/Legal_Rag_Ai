"""
Retrieval evaluation harness.

Answers three questions the FYP report has to answer with numbers:

  1. Does retrieval find the right statute for a real question?
  2. Does it correctly find NOTHING for an off-topic question?
  3. Is SIMILARITY_THRESHOLD set anywhere near the right value?

Why it exists
-------------
SIMILARITY_THRESHOLD is an L2 distance over normalised embeddings. That number
is meaningless on its own — it only means something relative to a specific
embedding model and corpus. Change either and it must be re-measured. It had
been left at 0.85 from an era when the corpus was 21KB of excerpts, where
retrieval returned nothing either way so nobody noticed it was wrong. Against
the real corpus, 0.85 rejected 8 of 10 genuine questions.

Usage
-----
    python scripts/eval_retrieval.py             # full report
    python scripts/eval_retrieval.py --sweep     # threshold sweep only
    python scripts/eval_retrieval.py --json      # machine-readable

Exit code is non-zero if the configured threshold looks miscalibrated, so this
can gate CI.
"""

from __future__ import annotations

import os
import sys
import json
import argparse
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
logging.disable(logging.INFO)

# ── Test set ──────────────────────────────────────────────────────────────────
# Real questions, in the register users actually write (English, Roman Urdu,
# Urdu script). `expect` is the file that should be retrieved. Keep this honest:
# add questions the system gets WRONG, don't curate it into a highlight reel.
RELEVANT = [
    ("What is the punishment for murder in Pakistan?",        "ppc"),
    ("Someone gave me a cheque that bounced",                 "ppc"),
    ("What is the punishment for cheating and fraud?",        "ppc"),
    ("Can I get bail for a non-bailable offence?",            "crpc"),
    ("Police ne FIR darj karne se mana kar diya",             "crpc"),
    ("How is an FIR registered?",                             "crpc"),
    ("Qatl ki saza kya hai?",                                 "ppc"),
    ("Khula ka procedure kya hai?",                           "dmma"),   # NOT mflo: khula is DMMA 1939
    ("Wife wants divorce, husband refuses",                   "dmma"),
    ("Can a man take a second wife in Pakistan?",             "mflo"),
    ("Someone is blackmailing me with my photos online",      "peca"),
    ("What is the punishment for cyber harassment?",          "peca"),
    ("Am I equal before the law regardless of religion?",     "constitution"),
    ("Do I have a right to a fair trial?",                    "constitution"),
    ("Can I challenge a government order in the High Court?", "constitution"),
    ("مجھے ضمانت کیسے ملے گی؟",                                "crpc"),
    ("قتل کی سزا کیا ہے؟",                                     "ppc"),
]

# Must retrieve nothing. If these pass the threshold, it is too loose.
IRRELEVANT = [
    "What is the capital of France?",
    "How do I bake a chocolate cake?",
    "Best cricket batsman of all time?",
    "Write me a poem about the sea",
    "What is the weather in Karachi tomorrow?",
    "How do I install Python on Windows?",
]

SWEEP = [0.85, 0.95, 1.05, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.50, 1.60]


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--sweep", action="store_true", help="threshold sweep only")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    a = ap.parse_args()

    from services.rag_service import (
        _get_vectorstore, SIMILARITY_THRESHOLD, EMBEDDING_MODEL,
    )

    vs = _get_vectorstore()
    if vs is None:
        print("No FAISS index. Run: python scripts/ingest_laws.py")
        return 1

    pos, neg, rows = [], [], []

    # recall@5, not top-1. The retriever hands top_k=5 chunks to the LLM, so a
    # correct provision at rank 3 is a success — judging on rank 1 alone
    # understates the system badly (62% vs 94% on the same index).
    hits5 = 0
    for q, expect in RELEVANT:
        hits = vs.similarity_search_with_score(q, k=5)
        if not hits:
            rows.append((q, expect, None, None, False))
            continue
        doc, score = hits[0]
        src = Path(doc.metadata.get("source", "?")).stem
        in5 = any(expect in Path(d.metadata.get("source", "?")).stem for d, _ in hits)
        hits5 += in5
        pos.append(score)
        rows.append((q, expect, score, src, in5))

    for q in IRRELEVANT:
        hits = vs.similarity_search_with_score(q, k=1)
        if hits:
            neg.append(hits[0][1])

    correct = sum(1 for *_, ok in rows if ok)
    kept = sum(1 for _, _, s, _, _ in rows if s is not None and s < SIMILARITY_THRESHOLD)
    leaked = sum(1 for s in neg if s < SIMILARITY_THRESHOLD)

    # Best threshold = keeps the most relevant while admitting zero junk.
    best, best_kept = None, -1
    for t in SWEEP:
        k = sum(1 for s in pos if s < t)
        j = sum(1 for s in neg if s < t)
        if j == 0 and k > best_kept:
            best, best_kept = t, k

    if a.json:
        print(json.dumps({
            "embedding_model": EMBEDDING_MODEL,
            "threshold": SIMILARITY_THRESHOLD,
            "relevant_total": len(RELEVANT),
            "right_statute": correct,
            "kept_at_threshold": kept,
            "junk_admitted": leaked,
            "relevant_l2": {"min": min(pos), "max": max(pos), "mean": sum(pos) / len(pos)},
            "irrelevant_l2": {"min": min(neg), "max": max(neg)},
            "suggested_threshold": best,
        }, indent=2))
        return 0

    print(f"Model     : {EMBEDDING_MODEL}")
    print(f"Threshold : {SIMILARITY_THRESHOLD}  (RAG_SIMILARITY_THRESHOLD)")
    print(f"Chunks    : {vs.index.ntotal:,}\n")

    if not a.sweep:
        print(f"{'QUESTION':46}{'L2':>7}  {'RETRIEVED':<16}{'':<4}")
        print("-" * 76)
        for q, expect, score, src, ok in rows:
            mark = "OK  " if ok else "MISS"
            gate = "" if score is None else (" " if score < SIMILARITY_THRESHOLD else " [cut]")
            print(f"{mark} {q[:44]:44}{score if score else 0:7.3f}  {(src or '-')[:15]:<16}{gate}")
        print(f"\nRight statute in top-5 : {correct}/{len(RELEVANT)}   (recall@5 — what the LLM receives)")
        print(f"Survives threshold     : {kept}/{len(RELEVANT)}")
        print(f"Junk admitted          : {leaked}/{len(IRRELEVANT)}")
        print(f"\nRELEVANT   L2  min={min(pos):.3f}  max={max(pos):.3f}  mean={sum(pos)/len(pos):.3f}")
        print(f"IRRELEVANT L2  min={min(neg):.3f}  max={max(neg):.3f}")
        gap = min(neg) - max(pos)
        print(f"Separation     {gap:+.3f}  ({'clean' if gap > 0 else 'OVERLAP — some junk scores closer than some real matches'})")

    print(f"\n{'THRESHOLD':>10}{'RELEVANT KEPT':>16}{'JUNK ADMITTED':>16}")
    print("-" * 42)
    for t in SWEEP:
        k = sum(1 for s in pos if s < t)
        j = sum(1 for s in neg if s < t)
        tag = "  <- configured" if abs(t - SIMILARITY_THRESHOLD) < 1e-6 else ("  <- best" if t == best else "")
        print(f"{t:>10.2f}{f'{k}/{len(pos)}':>16}{f'{j}/{len(neg)}':>16}{tag}")

    print(f"\nSuggested threshold: {best}  (keeps {best_kept}/{len(pos)}, admits 0 junk)")

    # Erring low is deliberate: a wrong statute is worse than an honest
    # "no statute matched", which the UI states plainly.
    if leaked > 0:
        print("\nWARNING: threshold admits off-topic content. Lower it.")
        return 1
    if best and SIMILARITY_THRESHOLD < best - 0.15:
        print(f"\nWARNING: threshold is far below the measured optimum "
              f"({SIMILARITY_THRESHOLD} vs {best}); real questions are being rejected.")
        return 1
    print("\nThreshold looks reasonable.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
