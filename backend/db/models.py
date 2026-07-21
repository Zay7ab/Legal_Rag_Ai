"""
ORM Models for Pakistan LegalAI

Tables:
  cases           — Court judgments / case law
  case_topics     — Many-to-many: cases ↔ legal topics
  bookmarks       — User-saved cases (session-based for now)
  search_history  — Query analytics
"""

from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime, Boolean,
    ForeignKey, Table, Index, func,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from db.database import Base


# ── Many-to-many: cases ↔ topics ──────────────────────────────────────────────
case_topics_table = Table(
    "case_topics",
    Base.metadata,
    Column("case_id", String(50), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", Integer, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True),
)


# ── Topics ─────────────────────────────────────────────────────────────────────
class Topic(Base):
    __tablename__ = "topics"

    id:    Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug:  Mapped[str]  = mapped_column(String(50), unique=True, nullable=False)   # "criminal_law"
    name:  Mapped[str]  = mapped_column(String(100), nullable=False)               # "Criminal Law"
    icon:  Mapped[str]  = mapped_column(String(10), default="⚖️")

    cases: Mapped[list[Case]] = relationship(
        "Case", secondary=case_topics_table, back_populates="topics"
    )

    def __repr__(self):
        return f"<Topic {self.slug}>"


# ── Cases ──────────────────────────────────────────────────────────────────────
class Case(Base):
    __tablename__ = "cases"

    # Primary key
    id: Mapped[str] = mapped_column(String(50), primary_key=True)   # e.g. "sc-2021-pld-45"

    # Core fields
    title:        Mapped[str]           = mapped_column(String(500), nullable=False)
    court:        Mapped[str]           = mapped_column(String(100), nullable=False)
    year:         Mapped[int]           = mapped_column(Integer, nullable=False)
    citation:     Mapped[str]           = mapped_column(String(200), nullable=False, unique=True)
    summary:      Mapped[str]           = mapped_column(Text, nullable=False)
    full_text:    Mapped[str | None] = mapped_column(Text, nullable=True)
    full_text_url:Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Metadata
    keywords:     Mapped[str]        = mapped_column(Text, default="")   # comma-separated
    judges:       Mapped[str | None] = mapped_column(String(500), nullable=True)
    petitioner:   Mapped[str | None] = mapped_column(String(300), nullable=True)
    respondent:   Mapped[str | None] = mapped_column(String(300), nullable=True)
    law_sections: Mapped[str | None] = mapped_column(Text, nullable=True)  # "PPC 302, CrPC 497"
    outcome:      Mapped[str | None] = mapped_column(String(50), nullable=True)  # "Appeal allowed" etc.
    is_landmark:  Mapped[bool]       = mapped_column(Boolean, default=False)

    # FTS column (SQLite: we manually maintain this; PostgreSQL: use tsvector)
    search_vector: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    topics: Mapped[list[Topic]] = relationship(
        "Topic", secondary=case_topics_table, back_populates="cases"
    )
    bookmarks: Mapped[list[Bookmark]] = relationship("Bookmark", back_populates="case", cascade="all, delete")

    # ── Indexes ────────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_cases_court", "court"),
        Index("ix_cases_year", "year"),
        Index("ix_cases_is_landmark", "is_landmark"),
    )

    def keywords_list(self) -> list[str]:
        return [k.strip() for k in self.keywords.split(",") if k.strip()]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "court": self.court,
            "year": self.year,
            "citation": self.citation,
            "summary": self.summary,
            "keywords": self.keywords_list(),
            "judges": self.judges,
            "petitioner": self.petitioner,
            "respondent": self.respondent,
            "law_sections": self.law_sections,
            "outcome": self.outcome,
            "is_landmark": self.is_landmark,
            "full_text_url": self.full_text_url,
            "topics": [t.name for t in self.topics],
        }

    def __repr__(self):
        return f"<Case {self.id}: {self.title[:50]}>"


# ── Bookmarks ──────────────────────────────────────────────────────────────────
class Bookmark(Base):
    __tablename__ = "bookmarks"

    id:         Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id:    Mapped[str]           = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    session_id: Mapped[str]           = mapped_column(String(100), nullable=False)   # browser session
    note:       Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]   = mapped_column(DateTime, server_default=func.now())

    case: Mapped["Case"] = relationship("Case", back_populates="bookmarks")

    __table_args__ = (
        Index("ix_bookmarks_session", "session_id"),
    )


# ── Search history (analytics) ─────────────────────────────────────────────────
class SearchHistory(Base):
    __tablename__ = "search_history"

    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    query:        Mapped[str]           = mapped_column(String(500), nullable=False)
    result_count: Mapped[int]           = mapped_column(Integer, default=0)
    filters:     Mapped[str | None] = mapped_column(String(500), nullable=True)  # JSON string
    searched_at: Mapped[datetime]   = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_search_history_query", "query"),
    )


# ── Lawyers ────────────────────────────────────────────────────────────────────
class Lawyer(Base):
    __tablename__ = "lawyers"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    name:       Mapped[str]      = mapped_column(String(200), nullable=False)
    city:       Mapped[str]      = mapped_column(String(100), nullable=False)
    area:       Mapped[str]      = mapped_column(String(100), nullable=False)
    exp:        Mapped[int]      = mapped_column(Integer, default=0)
    rating:     Mapped[float]    = mapped_column(Float, default=4.0)
    verified:   Mapped[bool]     = mapped_column(Boolean, default=False)
    languages:  Mapped[str]      = mapped_column(Text, default="Urdu")
    fee:        Mapped[str]      = mapped_column(String(100), default="")
    courts:     Mapped[str]      = mapped_column(Text, default="")
    edu:        Mapped[str]      = mapped_column(String(300), default="")
    about:      Mapped[str]      = mapped_column(Text, default="")
    phone:      Mapped[str]      = mapped_column(String(30), default="")
    whatsapp:   Mapped[str]      = mapped_column(String(30), default="")
    email:      Mapped[str]      = mapped_column(String(255), default="")
    chamber:    Mapped[str]      = mapped_column(String(300), default="")
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id":        self.id,
            "name":      self.name,
            "city":      self.city,
            "area":      self.area,
            "exp":       self.exp,
            "rating":    self.rating,
            "verified":  self.verified,
            "languages": [x.strip() for x in self.languages.split(",") if x.strip()],
            "fee":       self.fee,
            "courts":    [x.strip() for x in self.courts.split(",") if x.strip()],
            "edu":       self.edu,
            "about":     self.about,
            "phone":     self.phone,
            "whatsapp":  self.whatsapp,
            "email":     self.email,
            "chamber":   self.chamber,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<Lawyer {self.name} ({self.city})>"


# ── Chat feedback ──────────────────────────────────────────────────────────────
class ChatFeedback(Base):
    """
    Thumbs up/down on an AI answer.

    Stores the question, the answer, the RAG sources and whether RAG context was
    actually found -- so a down-vote can be traced back to *why* the retrieval
    failed (no context vs. wrong context vs. right context, bad generation).
    That triage is the whole point of collecting this.

    user_id is nullable: guests can rate too, keyed by session_id instead.
    """
    __tablename__ = "chat_feedback"

    id:         Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[str | None] = mapped_column(
        String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    rating:     Mapped[int]  = mapped_column(Integer, nullable=False)   # 1 = up, -1 = down
    question:   Mapped[str]  = mapped_column(Text, nullable=False)
    answer:     Mapped[str]  = mapped_column(Text, nullable=False)
    sources:    Mapped[str]  = mapped_column(Text, default="[]")        # JSON array of filenames
    has_rag_context: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    language:   Mapped[str]  = mapped_column(String(5), default="en")
    comment:    Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_feedback_rating_rag", "rating", "has_rag_context"),
    )


# ── User Chat History ─────────────────────────────────────────────────────────
class UserChatHistory(Base):
    __tablename__ = "user_chat_history"

    id:            Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:       Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id:    Mapped[str]      = mapped_column(String(100), index=True)
    session_title: Mapped[str]      = mapped_column(String(200), default="New Chat")
    role:          Mapped[str]      = mapped_column(String(20)) # "user" or "assistant"
    content:       Mapped[str]      = mapped_column(Text)
    created_at:    Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "session_title": self.session_title,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat()
        }


# ── User Biography Intake ─────────────────────────────────────────────────────
class UserIntake(Base):
    __tablename__ = "user_intake"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)

    # Step 1
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cnic: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dob: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Step 2
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Step 3
    profession: Mapped[str | None] = mapped_column(String(150), nullable=True)
    income_band: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "<50k", "50k-100k", ">100k"
    affordability: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "afford", "pro-bono"

    # Step 4
    stress_level: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-10
    impact_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_unsafe: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True)

    # Step 5
    opponent_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    opponent_relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dispute_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prior_history: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Step 6
    past_cases: Mapped[str | None] = mapped_column(Text, nullable=True)
    ongoing_case: Mapped[str | None] = mapped_column(Text, nullable=True)
    prior_consultation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Step 7
    goal: Mapped[str | None] = mapped_column(String(100), nullable=True)
    timeline: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Step 8
    expected_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_story: Mapped[str | None] = mapped_column(Text, nullable=True)
    documents_held: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Step 9
    consent: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.full_name,
            "cnic": self.cnic,
            "dob": self.dob,
            "gender": self.gender,
            "city": self.city,
            "address": self.address,
            "nationality": self.nationality,
            "profession": self.profession,
            "income_band": self.income_band,
            "affordability": self.affordability,
            "stress_level": self.stress_level,
            "impact_description": self.impact_description,
            "is_unsafe": self.is_unsafe,
            "opponent_type": self.opponent_type,
            "opponent_relationship": self.opponent_relationship,
            "dispute_description": self.dispute_description,
            "prior_history": self.prior_history,
            "past_cases": self.past_cases,
            "ongoing_case": self.ongoing_case,
            "prior_consultation": self.prior_consultation,
            "goal": self.goal,
            "timeline": self.timeline,
            "expected_outcome": self.expected_outcome,
            "full_story": self.full_story,
            "documents_held": self.documents_held,
            "consent": self.consent,
            "completed": self.completed,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


# ── Consultation requests (lawyer booking) ────────────────────────────────────
class ConsultationRequest(Base):
    """
    A consultation request a user drafts for a lawyer.

    IMPORTANT: this is NOT a calendar booking. Legal Rag Ai has no link to any
    lawyer's schedule. This table only persists the request the user drafted so
    it survives across devices and can be reviewed after login -- the user still
    sends it themselves using the lawyer's contact details. Status therefore
    starts at "drafted" and never auto-advances to "confirmed" on its own.
    """
    __tablename__ = "consultation_requests"

    id:          Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:     Mapped[int]  = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lawyer_id:   Mapped[int | None] = mapped_column(Integer, ForeignKey("lawyers.id", ondelete="SET NULL"), nullable=True)
    lawyer_name: Mapped[str]  = mapped_column(String(200), default="")   # snapshot, survives lawyer deletion
    date:        Mapped[str]  = mapped_column(String(20), default="")    # ISO date the user prefers
    time:        Mapped[str]  = mapped_column(String(20), default="")
    mode:        Mapped[str]  = mapped_column(String(20), default="In person")
    matter:      Mapped[str]  = mapped_column(Text, default="")
    status:      Mapped[str]  = mapped_column(String(20), default="drafted")  # drafted | sent | cancelled
    created_at:  Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lawyerId": self.lawyer_id,
            "lawyerName": self.lawyer_name,
            "date": self.date,
            "time": self.time,
            "mode": self.mode,
            "matter": self.matter,
            "status": self.status,
            "created": self.created_at.isoformat() if self.created_at else None,
        }
