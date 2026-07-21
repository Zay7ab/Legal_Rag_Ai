"""
Chat feedback — thumbs up/down on AI answers.

Doubles as the RAG evaluation signal: /stats breaks satisfaction down by
whether retrieval actually found context, which tells you if a bad answer was
a *retrieval* failure or a *generation* failure.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from db.models import ChatFeedback
from db.auth_models import User
from routers.auth import get_optional_user
from routers.admin import require_admin
import json

router = APIRouter()

MAX_TEXT = 8000


class FeedbackRequest(BaseModel):
    rating: int = Field(..., description="1 for thumbs up, -1 for thumbs down")
    question: str
    answer: str
    sources: List[str] = []
    has_rag_context: bool = False
    language: str = "en"
    session_id: Optional[str] = None
    comment: Optional[str] = None


@router.post("/")
def submit_feedback(
    req: FeedbackRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    if req.rating not in (1, -1):
        raise HTTPException(status_code=422, detail="rating must be 1 or -1")

    fb = ChatFeedback(
        user_id=user.id if user else None,
        session_id=req.session_id,
        rating=req.rating,
        # Truncate: these are attacker-controlled free text on an endpoint that
        # accepts anonymous submissions.
        question=req.question[:MAX_TEXT],
        answer=req.answer[:MAX_TEXT],
        sources=json.dumps(req.sources[:20]),
        has_rag_context=req.has_rag_context,
        language=req.language[:5],
        comment=(req.comment or "")[:2000] or None,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"ok": True, "id": fb.id}


@router.get("/stats")
def feedback_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Admin-only. RAG quality breakdown for the evaluation dashboard."""
    total = db.query(ChatFeedback).count()
    up = db.query(ChatFeedback).filter(ChatFeedback.rating == 1).count()
    down = db.query(ChatFeedback).filter(ChatFeedback.rating == -1).count()

    # The key diagnostic: satisfaction split by whether RAG retrieved anything.
    by_rag = (
        db.query(
            ChatFeedback.has_rag_context,
            ChatFeedback.rating,
            func.count(ChatFeedback.id),
        )
        .group_by(ChatFeedback.has_rag_context, ChatFeedback.rating)
        .all()
    )
    breakdown = {
        "with_rag":    {"up": 0, "down": 0},
        "without_rag": {"up": 0, "down": 0},
    }
    for has_rag, rating, count in by_rag:
        bucket = "with_rag" if has_rag else "without_rag"
        breakdown[bucket]["up" if rating == 1 else "down"] = count

    recent_negative = [
        {
            "question": f.question[:300],
            "has_rag_context": f.has_rag_context,
            "sources": json.loads(f.sources or "[]"),
            "comment": f.comment,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in db.query(ChatFeedback)
        .filter(ChatFeedback.rating == -1)
        .order_by(ChatFeedback.created_at.desc())
        .limit(25)
        .all()
    ]

    return {
        "total": total,
        "up": up,
        "down": down,
        "satisfaction_pct": round(up / total * 100, 1) if total else None,
        "breakdown_by_rag": breakdown,
        "coverage_gap_pct": (
            round(
                db.query(ChatFeedback).filter(ChatFeedback.has_rag_context == False).count()  # noqa: E712
                / total * 100, 1,
            ) if total else None
        ),
        "recent_negative": recent_negative,
    }
