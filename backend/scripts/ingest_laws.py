"""
Pakistan LegalAI — Law Document Ingestion Script
=================================================

This script ingests Pakistan law PDFs/TXTs and builds the FAISS vector index
used by the RAG chatbot.

STEP 1 — Add your law documents
─────────────────────────────────
Place PDF or TXT files in:  backend/data/laws/

Recommended documents (all free to download):

  Source: https://pakistancode.gov.pk
    ✅ Constitution of Pakistan 1973
    ✅ Pakistan Penal Code (PPC) Act XLV of 1860
    ✅ Criminal Procedure Code (CrPC) 1898
    ✅ Civil Procedure Code (CPC) 1908
    ✅ Muslim Family Laws Ordinance 1961
    ✅ Factories Act 1934
    ✅ Industrial Relations Act 2012
    ✅ Consumer Protection Act 2019

  Source: https://fia.gov.pk/files/laws
    ✅ Prevention of Electronic Crimes Act (PECA) 2016

  Source: Punjab/Sindh government sites
    ✅ Punjab Rented Premises Act 2009
    ✅ Sindh Rented Premises Ordinance 1979

  Suggested filenames (for best auto-detection):
    constitution_1973.pdf
    ppc.pdf
    crpc.pdf
    cpc.pdf
    mflo_1961.pdf
    peca_2016.pdf
    industrial_relations_2012.pdf
    factories_act_1934.pdf
    consumer_protection_2019.pdf
    punjab_rent_2009.pdf
    sindh_rent_1979.pdf

STEP 2 — Run this script
─────────────────────────
  cd backend
  python scripts/ingest_laws.py

STEP 3 — Restart backend
─────────────────────────
  The index is auto-loaded on startup.
  uvicorn main:app --reload
"""

import sys
import os
import time

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    docs_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "laws"
    )
    index_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "faiss_index"
    )

    print("=" * 60)
    print("  Pakistan LegalAI — Document Ingestion")
    print("=" * 60)

    # ── Check docs directory ───────────────────────────────────────────────────
    if not os.path.exists(docs_path):
        os.makedirs(docs_path)
        print(f"\n📁 Created: {docs_path}")
        print("\n⚠️  Directory is empty. Please add Pakistan law PDFs/TXTs.")
        print("   See script header for recommended sources.")
        sys.exit(0)

    pdf_files = [f for f in os.listdir(docs_path) if f.lower().endswith(".pdf")]
    txt_files = [f for f in os.listdir(docs_path) if f.lower().endswith(".txt")]
    all_files = pdf_files + txt_files

    if not all_files:
        print(f"\n⚠️  No PDF or TXT files in: {docs_path}")
        print("   Please add Pakistan law documents and re-run.")
        sys.exit(1)

    print(f"\n📂 Documents found in {docs_path}:")
    for f in sorted(pdf_files):
        size_kb = os.path.getsize(os.path.join(docs_path, f)) // 1024
        print(f"   📄 {f}  ({size_kb} KB)")
    for f in sorted(txt_files):
        size_kb = os.path.getsize(os.path.join(docs_path, f)) // 1024
        print(f"   📝 {f}  ({size_kb} KB)")

    print(f"\n   Total: {len(pdf_files)} PDF(s), {len(txt_files)} TXT(s)")

    # ── Confirm ────────────────────────────────────────────────────────────────
    if os.path.exists(index_path):
        print(f"\n⚠️  Existing index found at: {index_path}")
        ans = input("   Rebuild it? This will overwrite the existing index. (y/N): ").strip().lower()
        if ans != "y":
            print("   Aborted.")
            sys.exit(0)

    # ── Run ingestion ──────────────────────────────────────────────────────────
    print("\n🚀 Starting ingestion...\n")
    start = time.time()

    from services.rag_service import RAGService
    rag = RAGService()

    try:
        summary = rag.ingest_documents(docs_path)
        elapsed = time.time() - start

        print("\n" + "=" * 60)
        print("  ✅ Ingestion Complete!")
        print("=" * 60)
        print(f"  PDF files processed : {summary['pdf_files']}")
        print(f"  TXT files processed : {summary['txt_files']}")
        print(f"  Total pages         : {summary['total_pages']}")
        print(f"  Total chunks        : {summary['total_chunks']}")
        print(f"  Index saved to      : {summary['index_path']}")
        print(f"  Time taken          : {elapsed:.1f}s")
        print("=" * 60)
        print("\n  Next step: Restart your backend")
        print("  uvicorn main:app --reload --port 8000\n")

    except FileNotFoundError as e:
        print(f"\n❌ {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"\n❌ {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
