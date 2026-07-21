import os
import re
from typing import Tuple, List, Dict, Any
from pathlib import Path
from datetime import datetime, timezone
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

from services.query_expansion import expand  # noqa: E402

# Lazy singletons
_vectorstore = None
_embeddings = None

# ── Embedding model ────────────────────────────────────────────────────────────
# Multilingual by default, and that is not a nicety here.
#
# The previous model (all-MiniLM-L6-v2) is English-only. This app offers an Urdu
# toggle and its audience writes Roman Urdu, so that was a core failure, not an
# edge case. Measured against the real corpus, query "مجھے ضمانت کیسے ملے گی؟"
# (how do I get bail?):
#
#     all-MiniLM-L6-v2                   correct 0.128 vs decoy 0.134  -> noise
#     paraphrase-multilingual-MiniLM-L12 correct 0.513 vs decoy 0.240  -> clean hit
#
# It cannot read the script at all: 0.128 is indistinguishable from chance.
# Roman Urdu improved too ("Qatl ki saza kya hai?" decoy 0.147 -> 0.032).
# Same 384 dimensions, so the index shape is unchanged; the download is larger
# (~470MB vs ~90MB) and that is a fair price for the feature working.
#
# Changing this REQUIRES rebuilding the index (scripts/ingest_laws.py) and
# re-measuring SIMILARITY_THRESHOLD (scripts/eval_retrieval.py). Distances from
# two different models are not comparable. _verify_index_integrity() refuses to
# load an index built with a different model, so a forgotten rebuild fails loudly
# instead of silently returning nonsense.
EMBEDDING_MODEL = os.getenv(
    "RAG_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)

# ── Chunking config ────────────────────────────────────────────────────────────
CHUNK_SIZE = 1000        # characters per chunk
CHUNK_OVERLAP = 200      # overlap between chunks
SEPARATORS = [
    "\n\n\n",            # section breaks
    "\n\n",              # paragraph breaks
    "\n",                # line breaks
    ". ",                # sentence breaks
    " ",
    "",
]

# ── Similarity threshold ───────────────────────────────────────────────────────
# FAISS score here is L2 distance over NORMALISED embeddings (see
# encode_kwargs={"normalize_embeddings": True} below), so vectors are unit
# length and distance relates to cosine as:
#
#     L2 = sqrt(2 - 2*cos)      cos 1.0 -> 0.00
#                               cos 0.6 -> 0.89
#                               cos 0.3 -> 1.18
#                               cos 0.0 -> 1.41
#
# The old value of 0.85 implied cos >= 0.64 — near-duplicate-paraphrase
# territory. A real question ("What is the punishment for murder?") against
# statute prose lands around cos 0.3-0.5, so almost everything was rejected.
# It went unnoticed because the corpus used to be 21KB of excerpts: retrieval
# returned nothing either way, so the threshold was never exercised.
#
# Measured by scripts/eval_retrieval.py against the real index (3.3k chunks,
# 16 genuine questions incl. Roman Urdu and Urdu script, 6 nonsense ones):
#
#     threshold   relevant kept   junk admitted
#       0.85          9/16            0/6        <- previous value
#       0.95         10/16            0/6
#       1.05         15/16            0/6        <- chosen
#       1.25         16/16            2/6
#       1.60         16/16            4/6
#
# 1.05 keeps almost every real match and admits no junk. Erring low is
# deliberate: a wrong statute is worse than an honest "no statute matched",
# which the UI states plainly.
#
# NOTE this is model-specific. The first calibration gave 1.25 for
# all-MiniLM-L6-v2; switching to the multilingual model shifted the whole
# distribution and 1.25 then let junk through. Distances from two models are not
# comparable — always re-run eval_retrieval.py after changing EMBEDDING_MODEL.
#
# Re-measure with scripts/eval_retrieval.py if the corpus or embedding model
# changes; this number is only meaningful against those.
SIMILARITY_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "1.05"))

# ── Law file → friendly name mapping ──────────────────────────────────────────
LAW_NAME_MAP = {
    "constitution": "Constitution of Pakistan 1973",
    "ppc": "Pakistan Penal Code (PPC)",
    "penal": "Pakistan Penal Code (PPC)",
    "crpc": "Criminal Procedure Code (CrPC)",
    "criminal_procedure": "Criminal Procedure Code (CrPC)",
    "mflo": "Muslim Family Laws Ordinance 1961",
    "family": "Muslim Family Laws Ordinance 1961",
    "peca": "Prevention of Electronic Crimes Act (PECA) 2016",
    "cyber": "Prevention of Electronic Crimes Act (PECA) 2016",
    "industrial": "Industrial Relations Act 2012",
    "labour": "Industrial Relations Act 2012",
    "factories": "Factories Act 1934",
    "consumer": "Consumer Protection Act 2019",
    "rent": "Rented Premises Ordinance",
    "cpc": "Civil Procedure Code",
    "civil_procedure": "Civil Procedure Code",
}


def _friendly_source_name(file_path: str) -> str:
    """Convert a file path to a human-readable law name."""
    name = Path(file_path).stem.lower().replace("-", "_").replace(" ", "_")
    for key, label in LAW_NAME_MAP.items():
        if key in name:
            return label
    # Fallback: title-case the filename
    return Path(file_path).stem.replace("_", " ").replace("-", " ").title()


# ── FAISS index integrity ─────────────────────────────────────────────────────
# FAISS.load_local(..., allow_dangerous_deserialization=True) unpickles
# index.pkl, and unpickling executes arbitrary code. That flag is unavoidable
# with LangChain's FAISS wrapper, so instead we make sure we only ever load a
# pickle *this application wrote itself*.
#
# On save we record a SHA-256 of index.pkl in index.manifest.json. On load we
# recompute and compare. A pickle swapped on disk (stolen admin session, a
# container volume mount, a restored backup) no longer silently executes -- it
# is refused, and the app runs without RAG rather than running someone's shell.
#
# This is tamper *detection*, not a sandbox. It closes the realistic path
# (replace the file) rather than pretending pickle is safe.
MANIFEST_NAME = "index.manifest.json"


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def _write_index_manifest(index_path: Path) -> None:
    pkl = index_path / "index.pkl"
    if not pkl.exists():
        return
    manifest = {
        "index_pkl_sha256": _sha256_file(pkl),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "embedding_model": EMBEDDING_MODEL,
    }
    (index_path / MANIFEST_NAME).write_text(json.dumps(manifest, indent=2))
    logger.info("Wrote index manifest (sha256=%s...)", manifest["index_pkl_sha256"][:12])


def _verify_index_integrity(index_path: Path) -> bool:
    """True if index.pkl matches the recorded hash. False = refuse to load."""
    manifest_file = index_path / MANIFEST_NAME
    pkl = index_path / "index.pkl"

    if not manifest_file.exists():
        # Pre-existing index built before manifests, or a hand-copied one.
        # Warn loudly but allow, so upgrading doesn't brick a working install.
        logger.warning(
            "No %s next to the FAISS index -- integrity cannot be verified. "
            "Rebuild the index (Admin > Rebuild RAG Index) to generate one.",
            MANIFEST_NAME,
        )
        return True
    try:
        manifest = json.loads(manifest_file.read_text())
        expected = manifest.get("index_pkl_sha256")
        actual = _sha256_file(pkl)
    except Exception as exc:
        logger.error("Could not verify index integrity: %s", exc)
        return False

    # An index built with a different embedding model is not usable, but it has
    # the same shape (384 dims), so FAISS loads it happily and returns confident
    # nonsense. Catch it here rather than let it reach a user asking about bail.
    built_with = manifest.get("embedding_model")
    if built_with and built_with != EMBEDDING_MODEL:
        logger.error(
            "FAISS index was built with %s but the app is configured for %s. "
            "Distances are not comparable. Rebuild: python scripts/ingest_laws.py",
            built_with, EMBEDDING_MODEL,
        )
        return False

    if expected != actual:
        logger.error(
            "FAISS index.pkl FAILED integrity check (expected %s..., got %s...). "
            "Refusing to unpickle it. Rebuild the index from trusted law files.",
            str(expected)[:12], actual[:12],
        )
        return False
    logger.info("FAISS index integrity verified.")
    return True


def _get_vectorstore():
    """Lazy-init the FAISS vectorstore."""
    global _vectorstore, _embeddings
    if _vectorstore is not None:
        return _vectorstore

    try:
        from langchain_community.vectorstores import FAISS
        from langchain_community.embeddings import HuggingFaceEmbeddings

        backend_dir = Path(__file__).resolve().parent.parent
        index_path = backend_dir / "data" / "faiss_index"

        logger.info("Loading embedding model: %s", EMBEDDING_MODEL)
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

        if index_path.exists() and (index_path / "index.faiss").exists() and (index_path / "index.pkl").exists():
            if not _verify_index_integrity(index_path):
                # Degrade to no-RAG rather than execute an untrusted pickle.
                logger.error("Refusing to load FAISS index — integrity check failed.")
                return None
            _vectorstore = FAISS.load_local(
                str(index_path),
                _embeddings,
                allow_dangerous_deserialization=True,
            )
            logger.info("✅ FAISS index loaded from %s", index_path)
        else:
            logger.warning(
                "⚠️  No FAISS index found at %s — run: python scripts/ingest_laws.py",
                index_path,
            )

    except ImportError as e:
        logger.error("LangChain/FAISS import failed: %s", e)
    except Exception as e:
        logger.error("Error loading FAISS index: %s", e)

    return _vectorstore


# ── Main service ───────────────────────────────────────────────────────────────

class RAGService:
    """
    Retrieval-Augmented Generation service for Pakistan law.

    retrieve()  → returns (context_str, sources_list) for a given query
    ingest_documents() → builds the FAISS index from law PDFs/TXTs
    """

    def __init__(self, top_k: int = 5, use_mmr: bool = True, fetch_k: int = 20):
        self.top_k = top_k          # chunks returned to LLM
        self.use_mmr = use_mmr      # MMR = diversity-aware retrieval
        self.fetch_k = fetch_k      # candidate pool for MMR

    # ── Public: retrieve ──────────────────────────────────────────────────────

    def retrieve(self, query: str) -> Tuple[str, List[str]]:
        """
        Retrieve the most relevant law chunks for a user query.
        Only returns results if similarity score is above threshold.

        Returns:
            context  : concatenated chunk text to inject into LLM prompt
            sources  : list of friendly law names cited
        """
        vs = _get_vectorstore()
        if vs is None:
            return "", []

        # ── Query expansion ───────────────────────────────────────────────────
        # People write "khula"; the Act says "dissolution of marriage" and never
        # uses the word khula at all. That is a register change, not a paraphrase,
        # and no embedding model bridges it unaided.
        #
        # Additive only: the user's words stay and drive retrieval, statutory
        # terms are appended. A wrong mapping therefore degrades a query rather
        # than hijacking it, and the grounding decision is still made on real
        # similarity. See services/query_expansion.py.
        search_query = expand(query)
        if search_query != query:
            logger.debug("Expanded %r -> %r", query[:60], search_query[:110])

        try:
            # ── Score ke saath retrieve karo ──────────────────────────────────
            # similarity_search_with_score returns (doc, score) tuples
            # Score = L2 distance: KAM = better match, ZYADA = irrelevant
            docs_with_scores = vs.similarity_search_with_score(
                search_query, k=self.fetch_k
            )

            if not docs_with_scores:
                return "", []

            # ── Threshold filter ───────────────────────────────────────────────
            # Sirf woh documents rakh jo threshold se kam distance pe hain
            filtered = [
                (doc, score)
                for doc, score in docs_with_scores
                if score < SIMILARITY_THRESHOLD
            ]

            logger.info(
                "RAG: query='%s' | total=%d | passed_threshold=%d | threshold=%.2f",
                query[:60], len(docs_with_scores), len(filtered), SIMILARITY_THRESHOLD
            )

            # Agar koi bhi document threshold pass nahi kiya → empty return
            # → has_context = False → strict system prompt trigger hoga
            if not filtered:
                logger.info("RAG: No relevant Pakistan law docs found for query: %s", query[:60])
                return "", []

            # Top K filtered docs lo
            docs = [doc for doc, _ in filtered[:self.top_k]]

            # ── Build context with section headers ────────────────────────────
            context_parts = []
            for doc in docs:
                source = doc.metadata.get("source", "")
                law_name = _friendly_source_name(source)
                page = doc.metadata.get("page", "")
                section_label = f"[{law_name}{f', page {page}' if page else ''}]"
                context_parts.append(f"{section_label}\n{doc.page_content.strip()}")

            context = "\n\n---\n\n".join(context_parts)
            sources = list(
                dict.fromkeys(  # preserve order, deduplicate
                    _friendly_source_name(doc.metadata.get("source", ""))
                    for doc in docs
                )
            )
            return context, sources

        except Exception as e:
            logger.error("RAG retrieval error: %s", e)
            return "", []

    # ── Public: ingest ────────────────────────────────────────────────────────

    def ingest_documents(self, docs_path: str = "data/laws") -> Dict[str, Any]:
        """
        Ingest all law PDFs and TXTs from docs_path, build + save FAISS index.

        Returns a summary dict with counts.
        """
        from langchain_community.document_loaders import (
            PyPDFLoader,
            TextLoader,
            DirectoryLoader,
        )
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import FAISS
        from langchain_community.embeddings import HuggingFaceEmbeddings

        docs_path = Path(docs_path)
        if not docs_path.exists():
            raise FileNotFoundError(f"Laws directory not found: {docs_path}")

        # ── Load PDFs ──────────────────────────────────────────────────────────
        all_docs = []

        pdf_files = list(docs_path.glob("**/*.pdf"))
        txt_files = list(docs_path.glob("**/*.txt"))

        print(f"\n📂 Found {len(pdf_files)} PDF(s) and {len(txt_files)} TXT(s) in {docs_path}")

        for pdf_path in pdf_files:
            try:
                loader = PyPDFLoader(str(pdf_path))
                docs = loader.load()
                # Enrich metadata
                for doc in docs:
                    doc.metadata["source"] = str(pdf_path)
                    doc.metadata["law_name"] = _friendly_source_name(str(pdf_path))
                    doc.metadata["file_type"] = "pdf"
                all_docs.extend(docs)
                print(f"   ✅ {pdf_path.name} → {len(docs)} pages")
            except Exception as e:
                print(f"   ❌ Failed to load {pdf_path.name}: {e}")

        for txt_path in txt_files:
            try:
                loader = TextLoader(str(txt_path), encoding="utf-8")
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source"] = str(txt_path)
                    doc.metadata["law_name"] = _friendly_source_name(str(txt_path))
                    doc.metadata["file_type"] = "txt"
                all_docs.extend(docs)
                print(f"   ✅ {txt_path.name} → {len(docs)} page(s)")
            except Exception as e:
                print(f"   ❌ Failed to load {txt_path.name}: {e}")

        if not all_docs:
            raise ValueError("No documents were loaded. Check your data/laws/ directory.")

        # ── Clean text ─────────────────────────────────────────────────────────
        print(f"\n🧹 Cleaning {len(all_docs)} pages...")
        for doc in all_docs:
            doc.page_content = _clean_legal_text(doc.page_content)

        # ── Chunk ──────────────────────────────────────────────────────────────
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=SEPARATORS,
            length_function=len,
        )
        chunks = splitter.split_documents(all_docs)

        # Filter out very short/empty chunks
        chunks = [c for c in chunks if len(c.page_content.strip()) > 100]

        print(f"📄 Created {len(chunks)} chunks from {len(all_docs)} pages")

        # ── Embed + Index ──────────────────────────────────────────────────────
        print(f"\n🔢 Embedding chunks with {EMBEDDING_MODEL}...")
        print("   (This may take a few minutes on first run)")

        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

        # Build in batches to avoid memory issues
        BATCH = 500
        vectorstore = None
        for i in range(0, len(chunks), BATCH):
            batch = chunks[i : i + BATCH]
            print(f"   Batch {i // BATCH + 1}/{(len(chunks) - 1) // BATCH + 1} ({len(batch)} chunks)...")
            if vectorstore is None:
                vectorstore = FAISS.from_documents(batch, embeddings)
            else:
                vectorstore.add_documents(batch)

        # ── Save ───────────────────────────────────────────────────────────────
        index_path = Path("data/faiss_index")
        index_path.mkdir(parents=True, exist_ok=True)
        vectorstore.save_local(str(index_path))
        _write_index_manifest(index_path)   # record hash for load-time verification

        # Reset singleton so next retrieve() loads fresh index
        global _vectorstore
        _vectorstore = None

        summary = {
            "pdf_files": len(pdf_files),
            "txt_files": len(txt_files),
            "total_pages": len(all_docs),
            "total_chunks": len(chunks),
            "index_path": str(index_path),
        }
        print(f"\n✅ FAISS index saved → {index_path}")
        print(f"   {summary}")
        return summary


# ── Text cleaning ──────────────────────────────────────────────────────────────

def _clean_legal_text(text: str) -> str:
    """Clean extracted PDF text for better chunking and retrieval."""
    # Remove excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)

    # Remove page numbers (common patterns in legal PDFs)
    text = re.sub(r"\n\s*\d+\s*\n", "\n", text)
    text = re.sub(r"^\d+$", "", text, flags=re.MULTILINE)

    # Remove header/footer noise (lines with only dashes, dots, etc.)
    text = re.sub(r"^[-_=.]{3,}$", "", text, flags=re.MULTILINE)

    # Normalize section markers like "Section 302." or "Article 10."
    text = re.sub(r"\b(Section|Article|Sub-section|Clause)\s+(\d+)", r"\1 \2", text)

    return text.strip()
