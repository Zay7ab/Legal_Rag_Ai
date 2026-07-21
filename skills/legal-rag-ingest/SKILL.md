---
name: legal-rag-ingest
description: "Injest legal PDFs or TXT documents, clean content, partition into chunks, generate embeddings, and build the FAISS vector index for Pakistan LegalAI."
argument-hint: "[docs_path]"
license: MIT
metadata:
  author: Antigravity
  version: "1.0.0"
---

# Legal RAG Ingest Skill

Use this skill to manage, update, and rebuild the FAISS RAG (Retrieval-Augmented Generation) knowledge base for the Pakistan LegalAI platform.

## When to Activate

- When new Pakistani law files (PDFs, TXT) are added to the corpus.
- When the similarity threshold, chunk size, or overlap configuration is updated in `backend/services/rag_service.py`.
- When the `/health` or `/api/rag/status` endpoints report that `rag_index_ready` is false.
- When the chatbot returns empty responses or fails to find specific statutory references.

## Workflow

### Step 1: Place Source Files

Ensure the target law files are in the proper format (PDF or UTF-8 encoded text files) and placed in the backend laws folder:
`backend/data/laws/`

Supported files:
- Constitution of Pakistan (e.g. `Constitution_of_Pakistan_1973.pdf`)
- Pakistan Penal Code (PPC)
- Muslim Family Laws Ordinance (MFLO)
- Other statutes or PDF compilations of Pakistani case law.

### Step 2: Build the FAISS Vector Index

1. Ensure the Python virtual environment is activated.
2. Run the ingestion script from the backend directory:

```powershell
# In PowerShell:
cd backend
.\venv\Scripts\Activate.ps1
python scripts/ingest_laws.py
```

*Note: Ingesting large PDFs (e.g. 500+ pages) may take several minutes as sentence-transformers models run on the CPU.*

### Step 3: Verify the Index Construction

Check the API endpoint for confirmation that the FAISS index files have been correctly constructed in `backend/data/faiss_index/` (`index.faiss` and `index.pkl`):

1. Start the backend: `uvicorn main:app --reload --port 8000`
2. Perform an HTTP GET request to `http://localhost:8000/api/rag/status`.
3. Confirm `index_built` is `true` and the ingested list matches the files.
4. Call `http://localhost:8000/health` and verify `rag_index_ready` is `true`.

## Configurations

The configurations reside in [rag_service.py](file:///e:/Projects/pakistan-legalai/pakistan-legalai/backend/services/rag_service.py):
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Similarity Threshold**: `0.75` (L2 distance threshold, lower is more selective).
