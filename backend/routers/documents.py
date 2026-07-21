import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from services.doc_service import DocService
from services.llm_service import LLMService
from services.rag_service import RAGService
import os
import re
import base64
import io

logger = logging.getLogger(__name__)

router = APIRouter()
doc_service = DocService()
llm_service = LLMService()
rag_service = RAGService()


class DocumentRequest(BaseModel):
    template_id: str
    fields: Dict[str, Any]
    language: Optional[str] = "en"
    format: Optional[str] = "pdf"


class AISuggestRequest(BaseModel):
    template_id: str
    description: str   # plain-language user description


@router.get("/templates")
def get_templates():
    return doc_service.get_templates()


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    tmpl = doc_service.get_template(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.get("/categories")
def get_categories():
    return {"categories": doc_service.get_categories()}


@router.post("/generate")
async def generate_document(request: DocumentRequest):
    try:
        file_path = doc_service.generate(
            template_id=request.template_id,
            fields=request.fields,
            language=request.language,
            fmt=request.format,
        )
        ext = os.path.splitext(file_path)[1].lower()
        media_type = (
            "application/pdf" if ext == ".pdf"
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            if ext == ".docx"
            else "text/plain"
        )
        filename = f"{request.template_id}{ext}"
        return FileResponse(path=file_path, filename=filename, media_type=media_type)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-suggest")
async def ai_suggest_fields(request: AISuggestRequest):
    """Use LLM to suggest field values from a plain-language description."""
    try:
        suggestions = doc_service.get_ai_suggestions(
            template_id=request.template_id,
            description=request.description,
        )
        return {"suggestions": suggestions, "template_id": request.template_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ScanRequest(BaseModel):
    # Two ways in, because there are two real situations:
    #   upload a PDF  -> file_data (base64) + file_type
    #   paste text    -> text
    # `text` used to not exist, so the UI's "Paste text" tab 422'd on every
    # submit. Base64 round-tripping a string the user just typed is pointless.
    file_data: Optional[str] = None      # base64-encoded file content
    file_type: Optional[str] = None      # "application/pdf" | "text/plain"
    file_name: Optional[str] = "document"
    text: Optional[str] = None           # plain text pasted directly


# ── Retrieval query from a document ───────────────────────────────────────────
_LEGAL_HINTS = re.compile(
    r"\b(agreement|contract|lease|rent|tenant|landlord|notice|affidavit|deed|"
    r"power of attorney|partnership|employment|salary|termination|dispute|"
    r"arbitration|penalty|breach|indemnit|liabilit|jurisdiction|court|"
    r"talaq|khula|nikah|dower|maintenance|custody|fir|bail|cheque|"
    r"section \d+|article \d+)\b",
    re.I,
)


def _legal_query_from(doc_text: str, limit: int = 700) -> str:
    """
    Build a retrieval query from a document.

    Embedding 12,000 characters of contract returns noise -- the signal is
    swamped. Instead take the opening (which almost always names the document
    type) plus the sentences carrying legal vocabulary, which is what should
    actually drive retrieval.
    """
    head = " ".join(doc_text[:300].split())
    hits = []
    for sentence in re.split(r"(?<=[.;])\s+", doc_text[:6000]):
        if _LEGAL_HINTS.search(sentence):
            hits.append(" ".join(sentence.split()))
        if sum(len(h) for h in hits) > limit:
            break
    return (head + " " + " ".join(hits))[: limit + 300]


@router.post("/scan")
async def scan_document(request: ScanRequest):
    """
    Analyse a legal document, grounded in the corpus.

    Two ways in, because there are two real situations:
      upload a PDF  -> file_data (base64) + file_type
      paste text    -> text
    """
    try:
        if request.text and request.text.strip():
            doc_text = request.text.strip()
        elif request.file_data:
            doc_text = _extract_upload(request)
        else:
            raise HTTPException(
                status_code=422,
                detail="Send either `text` (pasted content) or `file_data` (base64 PDF).",
            )

        if not doc_text.strip():
            raise HTTPException(status_code=422, detail="The document appears to be empty.")

        return _analyse(doc_text, request.file_name)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document scan failed")
        raise HTTPException(status_code=500, detail=f"Could not analyse the document: {exc}")


def _extract_upload(request: ScanRequest) -> str:
    """Decode an uploaded file to text. PDFs only -- images need a vision model."""
    try:
        raw = base64.b64decode(request.file_data)
    except Exception:
        raise HTTPException(status_code=422, detail="file_data is not valid base64.")

    ftype = request.file_type or ""

    if ftype == "application/pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            text = "\n".join((pg.extract_text() or "") for pg in reader.pages).strip()
        except Exception:
            raise HTTPException(status_code=422, detail="Could not extract text from that PDF.")
        if not text:
            raise HTTPException(
                status_code=422,
                detail="That PDF has no extractable text (it's a scanned image). "
                       "Paste the text instead, or use a text-based PDF.",
            )
        return text

    if ftype.startswith("text/"):
        return raw.decode("utf-8", errors="replace").strip()

    raise HTTPException(
        status_code=422,
        detail="Only PDFs can be read directly. For a photo or scan, copy the text "
               "and use the Paste text option.",
    )


def _analyse(doc_text: str, file_name: Optional[str] = "document") -> dict:
    """
    Retrieve law for the document, then analyse it strictly against that law.

    This endpoint used to be pure LLM: the prompt said "You are a Pakistani legal
    document analyst" and asked for "Red Flags", with no retrieval at all. The
    model would happily write "this clause violates Section 420 PPC" straight out
    of its training data -- a legal citation with nothing behind it, on a page
    where someone is deciding whether to sign something. That is the same failure
    the chat endpoint was fixed for, so it gets the same treatment: retrieve
    first, and cite only what came back.
    """
    if len(doc_text) > 12000:
        doc_text = doc_text[:12000] + "\n\n[Document truncated for analysis]"

    retrieval_query = _legal_query_from(doc_text)
    context, sources = rag_service.retrieve(retrieval_query)
    has_context = bool(context)

    if has_context:
        law_block = f"""## PAKISTANI LAW RETRIEVED FOR THIS DOCUMENT
These are the ONLY statutes you may cite. Quote a section number only if it
appears below. If a concern is not covered here, describe it in plain terms
WITHOUT citing any law.

{context}"""
    else:
        law_block = """## NO PAKISTANI LAW WAS RETRIEVED FOR THIS DOCUMENT
You must NOT cite any statute, section number, or case. None has been provided,
and anything you recall from training is not verifiable here. Describe what the
document itself says, in plain language, and nothing more."""

    prompt = f"""You are a Pakistani legal document analyst.

{law_block}

## ABSOLUTE RULE
Never invent a section number, Act name, or case citation. Cite ONLY from the
retrieved law above. If you are unsure whether something is in the retrieved law,
do not cite it. A missing citation is acceptable; a wrong one is not.

## TASK
Analyse the document below and provide:

1. **Document Type** -- What kind of document is this?
2. **Summary** -- Brief overview in 2-3 sentences.
3. **Key Parties** -- Names and roles mentioned.
4. **Important Clauses** -- Top 5 important clauses, in the document's own words.
5. **Dates & Deadlines** -- Any important dates mentioned.
6. **Red Flags** -- Concerning terms, missing elements, or unusual conditions.
   Cite the retrieved law ONLY where it directly applies.
7. **Plain Language Explanation** -- What does this mean for the person holding it?

---

{doc_text}"""

    analysis = llm_service.complete(prompt)
    return {
        "analysis": analysis,
        "file_name": file_name,
        "char_count": len(doc_text),
        # Same contract as /api/chat, so the UI can show the grounding strip.
        "sources": sources,
        "has_rag_context": has_context,
    }
