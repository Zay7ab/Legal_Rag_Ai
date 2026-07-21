# pyrefly: ignore [missing-import]
import logging
from fastapi import APIRouter, HTTPException, Depends, Header
# pyrefly: ignore [missing-import]
from fastapi.responses import StreamingResponse
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import UserChatHistory, UserIntake
from routers.auth import get_optional_user
from services.rag_service import RAGService
from services.llm_service import LLMService
from services.refusal import refusal_for
import json
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()
rag_service = RAGService(top_k=5, use_mmr=True, fetch_k=20)
llm_service = LLMService()


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    language: Optional[str] = "en"   # "en" or "ur"
    session_id: Optional[str] = None
    session_title: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    has_rag_context: bool = False
    disclaimer: str = (
        "This is AI-generated legal information, not formal legal advice. "
        "Consult a qualified Pakistani lawyer for your specific case."
    )


# ── Corpus manifest ───────────────────────────────────────────────────────────
_LAW_LABELS = {
    "ppc":                "Pakistan Penal Code 1860",
    "crpc":               "Code of Criminal Procedure 1898",
    "cpc_1908":           "Code of Civil Procedure 1908",
    "constitution_1973":  "Constitution of Pakistan 1973",
    "qanun_e_shahadat":   "Qanun-e-Shahadat Order 1984 (evidence)",
    "peca_2016":          "Prevention of Electronic Crimes Act 2016",
    "mflo_1961":          "Muslim Family Laws Ordinance 1961",
    "dmma_1939":          "Dissolution of Muslim Marriages Act 1939 (khula)",
    "punjab_rent_2009":   "Punjab Rented Premises Act 2009 (partial)",
}

_manifest_cache: Optional[str] = None


def _corpus_manifest() -> str:
    """List the statutes actually present in data/laws, once, at first use."""
    global _manifest_cache
    if _manifest_cache is not None:
        return _manifest_cache
    laws_dir = Path(__file__).resolve().parent.parent / "data" / "laws"
    names = []
    try:
        for f in sorted(laws_dir.glob("*.txt")):
            names.append(_LAW_LABELS.get(f.stem, f.stem.replace("_", " ").title()))
    except Exception:
        pass
    _manifest_cache = "\n".join(f"- {n}" for n in names) or "- (no law files loaded)"
    return _manifest_cache


def _build_system_prompt(language: str, context: str, has_context: bool, biography_context: str = "") -> str:
    if language == "ur":
        lang_instruction = (
            "Write your ENTIRE reply in proper Urdu (Nastaliq) script (اردو), "
            "EVEN IF the user wrote their question in English or Roman Urdu. "
            "Do NOT reply in Roman Urdu and do NOT reply in English sentences. "
            "Only law names, section/article numbers and abbreviations "
            "(e.g. 'Section 302 PPC', 'Article 10A') stay in English."
        )
    elif language == "roman":
        lang_instruction = (
            "Write your ENTIRE reply in Roman Urdu -- everyday Pakistani Urdu in the "
            "Latin alphabet, the way people text (e.g. 'Aap ke paas ye haq hai...'), "
            "EVEN IF the user wrote their question in English or Urdu script. "
            "Do NOT use Urdu/Nastaliq script and do NOT reply in pure English. "
            "Keep law names and section/article numbers in English (e.g. 'Section 302 PPC')."
        )
    else:
        lang_instruction = (
            "Write your ENTIRE reply in clear, plain English, EVEN IF the user wrote "
            "their question in Urdu or Roman Urdu. Do NOT reply in Urdu script or in "
            "Roman Urdu; translate everything into English."
        )

    context_block = (
        f"""
## Relevant Legal Context (retrieved from Pakistan law corpus)

{context}

Use the above context to support your answer. Always cite the specific law,
section, or article number when referencing it.
"""
        if has_context
        else """
## STRICT RULE - VERY IMPORTANT
No relevant Pakistani law document was found for this query.
You MUST respond with exactly this:
"I don't have specific information about this in my Pakistan law database.
This query may not be covered under Pakistani law or my legal corpus.
Please consult a qualified Pakistani lawyer for guidance."

DO NOT answer from general knowledge.
DO NOT discuss Indian law (IPC) or any non-Pakistani law.
DO NOT make up section numbers or cases.
STOP and return the above message only.
"""
    )

    # The corpus list is generated from what is ACTUALLY on disk.
    #
    # It used to be a hardcoded wish-list that claimed the Industrial Relations
    # Act 2012, the Factories Act 1934 and the Consumer Protection Act 2019 —
    # none of which are in the corpus. Telling a model "you know labour law"
    # when retrieval can never surface labour law is a standing invitation to
    # invent it. The prompt must describe the library that exists.
    return f"""### OUTPUT LANGUAGE — HIGHEST PRIORITY RULE (overrides everything below)
{lang_instruction}
The user has chosen this answer language deliberately. Never switch languages to
match how the question happened to be typed. Apply this to the entire response.

---

You are **legalRag Ai** — an expert AI legal assistant specializing
exclusively in the laws of Pakistan.

{biography_context}

Your knowledge comes ONLY from the retrieved context below. The corpus contains:
{_corpus_manifest()}

You have NO other legal knowledge. If something is not in the retrieved context,
you do not know it — say so rather than reasoning from memory.

## Response Rules
1. **Always cite** the specific law name + Section/Article number (e.g., "Section 302 PPC", "Article 10(2) of the Constitution").
2. **Structure your answers** with clear headings when the answer has multiple parts.
3. **Be practical**: After explaining the law, briefly tell the user what they can actually do.
4. **Acknowledge limits**: If a question requires a lawyer (e.g., court filing, specific case strategy), say so clearly.
5. **Never fabricate** section numbers or case citations.
6. **Answer language**: obey the OUTPUT LANGUAGE rule at the very top — {lang_instruction}

{context_block}"""


def _get_biography_context(current_user, db: Session) -> str:
    if not (current_user and db):
        return ""
    intake = db.query(UserIntake).filter(UserIntake.user_id == current_user.id).first()
    if not (intake and intake.completed):
        return ""
    return f"""
## User Background Biography (Use this context to address the user by name, understand their jurisdiction based on their location/city, and tailor your answer specifically to their dispute)
- **Full Name**: {intake.full_name}
- **Gender**: {intake.gender}
- **Age/DOB**: {intake.dob or "Not provided"}
- **Location**: {intake.city} (Address: {intake.address})
- **Nationality**: {intake.nationality}
- **Profession**: {intake.profession}
- **Income/Affordability**: Band: {intake.income_band or "Not provided"}, Fee Status: {intake.affordability}
- **Stress Level**: {intake.stress_level}/10 (Impact: {intake.impact_description})
- **Opposing Party**: {intake.opponent_type} (Relationship: {intake.opponent_relationship})
- **Dispute Description**: {intake.dispute_description}
- **Case History**: Past: {intake.past_cases or "None"}, Ongoing: {intake.ongoing_case or "None"}, Consults: {intake.prior_consultation or "None"}
- **Dispute Goal / Timeline**: Goal: {intake.goal}, Timeline: {intake.timeline}
- **Full Story in User's Words**: {intake.full_story}
"""


def _is_greeting(message: str) -> bool:
    msg = message.strip().lower().rstrip("?").rstrip("!").rstrip(".").replace("-", " ")
    words = msg.split()
    if not words:
        return False
        
    greetings_set = {
        "hi", "hello", "hey", "greetings", "howdy", "good morning", "good afternoon", "good evening",
        "salam", "assalam", "assalamu", "asalam", "aoa", "assalam o alaikum", "assalamoalaikum", "asalamoalaikum",
        "kya haal", "kaise ho", "how are you", "kya haal hai", "hal chal", "hola", "hy", "helo",
        "walaikum assalam", "walaikumussalam", "wsalam", "w salam"
    }
    
    if msg in greetings_set:
        return True
        
    for i in range(1, min(len(words) + 1, 4)):
        phrase = " ".join(words[:i])
        if phrase in greetings_set:
            remaining = words[i:]
            if len(remaining) <= 2:
                return True
    return False


def _greeting_response(language: str) -> str:
    if language == "ur":
        return "السلام علیکم! میں لیگل رَیگ اے آئی ہوں، آپ کا پاکستانی قانونی معاون۔ میں آج آپ کی کیا مدد کر سکتا ہوں؟"
    elif language == "roman":
        return "Assalam-o-Alaikum! Main Legal Rag Ai hoon, aap ka Pakistani legal assistant. Aaj main aap ki kya madad kar sakta hoon?"
    else:
        return "Hello! I am legalRag Ai, your Pakistan Law Assistant. How can I help you today?"


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user=Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    try:
        # Check if the query is a simple greeting
        if _is_greeting(request.message):
            greeting_text = _greeting_response(request.language)
            if current_user and db and request.session_id:
                try:
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="user", content=request.message))
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="assistant", content=greeting_text))
                    db.commit()
                except Exception as e:
                    logger.error("Failed to save greeting chat history to DB: %s", e)
            return ChatResponse(
                answer=greeting_text,
                sources=[],
                has_rag_context=False,
            )

        # ── Step 1: Query expansion for better RAG retrieval ──────────────────
        # If the message is very short, expand it before retrieval
        retrieval_query = request.message
        if len(request.message.split()) < 5 and request.history:
            # Add last assistant turn as context for short follow-ups
            last_msgs = [m for m in request.history if m.role == "user"]
            if last_msgs:
                retrieval_query = f"{last_msgs[-1].content} {request.message}"

        # ── Step 2: RAG retrieval ─────────────────────────────────────────────
        context, sources = rag_service.retrieve(retrieval_query)
        has_context = bool(context)

        # ── Step 3: No context -> refuse in code. Do not call the LLM. ────────
        if not has_context:
            logger.info("No RAG context for %r -- deterministic refusal, no LLM call", request.message[:80])
            refusal_text = refusal_for(request.language)
            if current_user and db and request.session_id:
                try:
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="user", content=request.message))
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="assistant", content=refusal_text))
                    db.commit()
                except Exception as e:
                    logger.error("Failed to save refusal chat history to DB: %s", e)
            return ChatResponse(
                answer=refusal_text,
                sources=[],
                has_rag_context=False,
            )

        # ── Step 4: Build system prompt ───────────────────────────────────────
        biography_context = _get_biography_context(current_user, db)
        system_prompt = _build_system_prompt(
            language=request.language,
            context=context,
            has_context=has_context,
            biography_context=biography_context,
        )

        # ── Step 5: Build message history (last 8 turns) ──────────────────────
        messages = []
        for msg in request.history[-8:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        # ── Step 6: LLM call ──────────────────────────────────────────────────
        answer = llm_service.chat(system_prompt, messages)

        if current_user and db and request.session_id:
            try:
                db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="user", content=request.message))
                db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="assistant", content=answer))
                db.commit()
            except Exception as e:
                logger.error("Failed to save chat history to DB: %s", e)

        return ChatResponse(
            answer=answer,
            sources=sources,
            has_rag_context=has_context,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user=Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """SSE streaming endpoint — emits meta then token chunks."""
    # Check if the query is a simple greeting
    if _is_greeting(request.message):
        def greeting_stream():
            yield f"data: {json.dumps({'type': 'meta', 'sources': [], 'has_rag_context': False})}\n\n"
            text = _greeting_response(request.language)
            for word in text.split(" "):
                yield f"data: {json.dumps({'type': 'chunk', 'text': word + ' '})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
            if current_user and db and request.session_id:
                try:
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="user", content=request.message))
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="assistant", content=text))
                    db.commit()
                except Exception as e:
                    logger.error("Failed to save greeting chat history to DB: %s", e)

        return StreamingResponse(
            greeting_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    retrieval_query = request.message
    if len(request.message.split()) < 5 and request.history:
        last_user = [m for m in request.history if m.role == "user"]
        if last_user:
            retrieval_query = f"{last_user[-1].content} {request.message}"

    context, sources = rag_service.retrieve(retrieval_query)
    has_context = bool(context)

    # Same guard as the non-streaming path. The UI only calls /stream, so
    # leaving it out here would make the protection cosmetic.
    if not has_context:
        logger.info("No RAG context for %r -- deterministic refusal, no LLM call", request.message[:80])

        def refusal_stream():
            yield f"data: {json.dumps({'type': 'meta', 'sources': [], 'has_rag_context': False})}\n\n"
            # Streamed word-by-word so it reads like every other answer rather
            # than appearing instantly and feeling like an error page.
            text = refusal_for(request.language)
            for word in text.split(" "):
                yield f"data: {json.dumps({'type': 'chunk', 'text': word + ' '})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
            if current_user and db and request.session_id:
                try:
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="user", content=request.message))
                    db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="assistant", content=text))
                    db.commit()
                except Exception as e:
                    logger.error("Failed to save refusal chat history to DB: %s", e)

        return StreamingResponse(
            refusal_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    biography_context = _get_biography_context(current_user, db)
    system_prompt = _build_system_prompt(
        language=request.language,
        context=context,
        has_context=has_context,
        biography_context=biography_context,
    )

    messages = [{"role": m.role, "content": m.content} for m in request.history[-8:]]
    messages.append({"role": "user", "content": request.message})

    def event_stream():
        # Emit metadata first so the client knows sources / RAG status
        meta = {"type": "meta", "sources": sources, "has_rag_context": has_context}
        yield f"data: {json.dumps(meta)}\n\n"
        full_answer = ""
        try:
            for chunk in llm_service.stream(system_prompt, messages):
                full_answer += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'text': str(exc)})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        if current_user and db and request.session_id:
            try:
                db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="user", content=request.message))
                db.add(UserChatHistory(user_id=current_user.id, session_id=request.session_id, session_title=request.session_title or "New Chat", role="assistant", content=full_answer))
                db.commit()
            except Exception as e:
                logger.error("Failed to save chat history to DB: %s", e)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/topics")
def get_topics():
    return {
        "topics": [
            {"id": "ppc", "name": "Pakistan Penal Code (PPC)", "icon": "⚖️"},
            {"id": "constitution", "name": "Constitution of Pakistan 1973", "icon": "📜"},
            {"id": "crpc", "name": "Criminal Procedure Code (CrPC)", "icon": "🔨"},
            {"id": "family", "name": "Muslim Family Laws Ordinance", "icon": "👨‍👩‍👧"},
            {"id": "cyber", "name": "Cyber Crime Laws (PECA 2016)", "icon": "💻"},
            {"id": "labour", "name": "Labour & Employment Laws", "icon": "⚒️"},
            {"id": "rent", "name": "Rent & Property Law", "icon": "🏠"},
            {"id": "consumer", "name": "Consumer Protection Law", "icon": "🛒"},
            {"id": "cpc", "name": "Civil Procedure Code (CPC)", "icon": "📋"},
            {"id": "women", "name": "Women's Rights & Protection Laws", "icon": "👩"},
        ]
    }
