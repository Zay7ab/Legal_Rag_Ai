"""
Database-backed case law search service.

Supports:
  - Full-text search across title, summary, keywords, law_sections
  - Filter by court, year range, topic, landmark status
  - Pagination with total count
  - Bookmark management
  - Search analytics
  - PostgreSQL tsvector FTS (when using PostgreSQL)
  - SQLite LIKE-based FTS fallback (for development)
"""

import json
import os
from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, text
from db.models import Case, Topic, Bookmark, SearchHistory
from db.database import DATABASE_URL


_IS_POSTGRES = DATABASE_URL.startswith("postgresql")


class SearchService:

    # ── Case search ────────────────────────────────────────────────────────────

    def search(
        self,
        db: Session,
        query: str,
        court: Optional[str] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        topic_slug: Optional[str] = None,
        landmark_only: bool = False,
        limit: int = 10,
        offset: int = 0,
    ) -> Tuple[List[Dict], int]:
        q = db.query(Case)

        if query.strip():
            if _IS_POSTGRES:
                fts_query = func.plainto_tsquery("english", query)
                q = q.filter(
                    func.to_tsvector("english", Case.search_vector).op("@@")(fts_query)
                )
            else:
                terms = query.lower().split()
                conditions = [Case.search_vector.contains(term) for term in terms]
                q = q.filter(and_(*conditions))

        if court:
            q = q.filter(Case.court.ilike(f"%{court}%"))
        if year_from:
            q = q.filter(Case.year >= year_from)
        if year_to:
            q = q.filter(Case.year <= year_to)
        if topic_slug:
            q = q.join(Case.topics).filter(Topic.slug == topic_slug)
        if landmark_only:
            q = q.filter(Case.is_landmark == True)

        total = q.count()
        q = q.order_by(Case.is_landmark.desc(), Case.year.desc())
        cases = q.offset(offset).limit(limit).all()

        self._log_search(db, query, total, court=court, year_from=year_from,
                         year_to=year_to, topic=topic_slug)

        return [c.to_dict() for c in cases], total

    def get_by_id(self, db: Session, case_id: str) -> Optional[Dict]:
        case = db.query(Case).filter(Case.id == case_id).first()
        return case.to_dict() if case else None

    def get_landmark_cases(self, db: Session, limit: int = 10) -> List[Dict]:
        cases = (
            db.query(Case)
            .filter(Case.is_landmark == True)
            .order_by(Case.year.desc())
            .limit(limit)
            .all()
        )
        return [c.to_dict() for c in cases]

    def get_recent_cases(self, db: Session, limit: int = 10) -> List[Dict]:
        cases = db.query(Case).order_by(Case.year.desc()).limit(limit).all()
        return [c.to_dict() for c in cases]

    def get_by_topic(self, db: Session, topic_slug: str, limit: int = 20) -> List[Dict]:
        cases = (
            db.query(Case)
            .join(Case.topics)
            .filter(Topic.slug == topic_slug)
            .order_by(Case.is_landmark.desc(), Case.year.desc())
            .limit(limit)
            .all()
        )
        return [c.to_dict() for c in cases]

    def get_stats(self, db: Session) -> Dict[str, Any]:
        total_cases = db.query(Case).count()
        landmark_cases = db.query(Case).filter(Case.is_landmark == True).count()
        courts = db.query(Case.court, func.count(Case.id)).group_by(Case.court).all()
        year_range = db.query(func.min(Case.year), func.max(Case.year)).first()
        total_searches = db.query(SearchHistory).count()
        return {
            "total_cases": total_cases,
            "landmark_cases": landmark_cases,
            "courts_breakdown": {court: count for court, count in courts},
            "year_range": {"min": year_range[0], "max": year_range[1]} if year_range and year_range[0] else {},
            "total_searches": total_searches,
        }

    def add_bookmark(self, db: Session, case_id: str, session_id: str, note=None) -> Dict:
        existing = db.query(Bookmark).filter(
            Bookmark.case_id == case_id, Bookmark.session_id == session_id
        ).first()
        if existing:
            return {"status": "already_bookmarked", "id": existing.id}
        bookmark = Bookmark(case_id=case_id, session_id=session_id, note=note)
        db.add(bookmark)
        db.commit()
        return {"status": "bookmarked", "id": bookmark.id}

    def remove_bookmark(self, db: Session, case_id: str, session_id: str) -> bool:
        deleted = db.query(Bookmark).filter(
            Bookmark.case_id == case_id, Bookmark.session_id == session_id
        ).delete()
        db.commit()
        return deleted > 0

    def get_bookmarks(self, db: Session, session_id: str) -> List[Dict]:
        bookmarks = (
            db.query(Bookmark)
            .filter(Bookmark.session_id == session_id)
            .order_by(Bookmark.created_at.desc())
            .all()
        )
        results = []
        for bm in bookmarks:
            d = bm.case.to_dict()
            d["bookmark_note"] = bm.note
            d["bookmarked_at"] = bm.created_at.isoformat()
            results.append(d)
        return results

    def get_all_topics(self, db: Session) -> List[Dict]:
        topics = db.query(Topic).all()
        return [{"id": t.id, "slug": t.slug, "name": t.name, "icon": t.icon} for t in topics]

    def _log_search(self, db: Session, query: str, result_count: int, **filters):
        try:
            filters_str = json.dumps({k: v for k, v in filters.items() if v is not None})
            db.add(SearchHistory(query=query, result_count=result_count, filters=filters_str))
            db.commit()
        except Exception:
            db.rollback()

    def get_popular_searches(self, db: Session, limit: int = 10) -> List[Dict]:
        results = (
            db.query(
                SearchHistory.query,
                func.count(SearchHistory.id).label("count"),
                func.avg(SearchHistory.result_count).label("avg_results"),
            )
            .group_by(SearchHistory.query)
            .order_by(func.count(SearchHistory.id).desc())
            .limit(limit)
            .all()
        )
        return [
            {"query": r.query, "count": r.count, "avg_results": round(r.avg_results or 0)}
            for r in results
        ]
