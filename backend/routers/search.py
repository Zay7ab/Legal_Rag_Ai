from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from db.database import get_db
from services.search_service import SearchService

router = APIRouter()
search_service = SearchService()


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class CaseResult(BaseModel):
    id: str
    title: str
    court: str
    year: int
    citation: str
    summary: str
    keywords: List[str]
    judges: Optional[str] = None
    petitioner: Optional[str] = None
    respondent: Optional[str] = None
    law_sections: Optional[str] = None
    outcome: Optional[str] = None
    is_landmark: bool = False
    full_text_url: Optional[str] = None
    topics: List[str] = []

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    results: List[CaseResult]
    total: int
    query: str
    page: int
    pages: int


class BookmarkRequest(BaseModel):
    case_id: str
    session_id: str
    note: Optional[str] = None


# ── Search ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=SearchResponse)
def search_cases(
    q: str = Query(..., description="Search query", min_length=1),
    court: Optional[str] = Query(None),
    year_from: Optional[int] = Query(None, ge=1947),
    year_to: Optional[int] = Query(None, le=2030),
    topic: Optional[str] = Query(None, description="Topic slug"),
    landmark_only: bool = Query(False),
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit
    try:
        results, total = search_service.search(
            db=db,
            query=q,
            court=court,
            year_from=year_from,
            year_to=year_to,
            topic_slug=topic,
            landmark_only=landmark_only,
            limit=limit,
            offset=offset,
        )
        pages = max(1, (total + limit - 1) // limit)
        return SearchResponse(results=results, total=total, query=q, page=page, pages=pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/landmarks", response_model=List[CaseResult])
def get_landmark_cases(limit: int = Query(10, le=30), db: Session = Depends(get_db)):
    return search_service.get_landmark_cases(db, limit=limit)


@router.get("/recent", response_model=List[CaseResult])
def get_recent_cases(limit: int = Query(10, le=30), db: Session = Depends(get_db)):
    return search_service.get_recent_cases(db, limit=limit)


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return search_service.get_stats(db)


@router.get("/popular-searches")
def get_popular_searches(limit: int = Query(10, le=20), db: Session = Depends(get_db)):
    return search_service.get_popular_searches(db, limit=limit)


# ── Topics ─────────────────────────────────────────────────────────────────────

@router.get("/topics")
def get_topics(db: Session = Depends(get_db)):
    topics = search_service.get_all_topics(db)
    if not topics:
        # Fallback before DB is seeded
        return {"topics": [
            {"slug": "criminal_law", "name": "Criminal Law", "icon": "⚖️"},
            {"slug": "constitutional_law", "name": "Constitutional Law", "icon": "📜"},
            {"slug": "family_law", "name": "Family Law", "icon": "👨‍👩‍👧"},
            {"slug": "labour_law", "name": "Labour Law", "icon": "⚒️"},
            {"slug": "property_law", "name": "Property Law", "icon": "🏠"},
            {"slug": "cyber_law", "name": "Cyber Law", "icon": "💻"},
            {"slug": "women_rights", "name": "Women's Rights", "icon": "👩"},
            {"slug": "consumer_law", "name": "Consumer Law", "icon": "🛒"},
        ]}
    return {"topics": topics}


@router.get("/courts")
def get_courts():
    return {"courts": [
        "Supreme Court of Pakistan",
        "Lahore High Court",
        "Sindh High Court",
        "Peshawar High Court",
        "Balochistan High Court",
        "Islamabad High Court",
        "Federal Shariat Court",
        "Consumer Court",
    ]}


# ── Bookmarks ──────────────────────────────────────────────────────────────────

@router.post("/bookmarks")
def add_bookmark(req: BookmarkRequest, db: Session = Depends(get_db)):
    case = search_service.get_by_id(db, req.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return search_service.add_bookmark(db, req.case_id, req.session_id, req.note)


@router.delete("/bookmarks/{case_id}")
def remove_bookmark(
    case_id: str,
    session_id: str = Query(...),
    db: Session = Depends(get_db),
):
    removed = search_service.remove_bookmark(db, case_id, session_id)
    return {"removed": removed}


@router.get("/bookmarks")
def get_bookmarks(session_id: str = Query(...), db: Session = Depends(get_db)):
    return search_service.get_bookmarks(db, session_id)


# ── Case by ID ─────────────────────────────────────────────────────────────────

@router.get("/{case_id}", response_model=CaseResult)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = search_service.get_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case
