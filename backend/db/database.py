"""
Database engine, session factory, and base model.

Supports both PostgreSQL (production) and SQLite (development/testing).
Set DATABASE_URL in .env to switch:
  PostgreSQL: postgresql://user:password@localhost:5432/legalai
  SQLite:     sqlite:///./legalai.db   ← default (no setup needed)
"""

import os
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, event
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker, DeclarativeBase
# pyrefly: ignore [missing-import]
from sqlalchemy.pool import StaticPool

# ── Connection URL ─────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./legalai.db")

# ── Engine ─────────────────────────────────────────────────────────────────────
_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Enable WAL mode + full-text search for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=False,
    )

# ── Session factory ────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Base model ─────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency for FastAPI routes ──────────────────────────────────────────────
def get_db():
    """FastAPI dependency — yields a DB session, closes on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Init all tables ────────────────────────────────────────────────────────────
def init_db():
    """Create all tables if they don't exist. Call on startup."""
    from db import models        # noqa: F401 — register Case, Topic, etc.
    from db import auth_models   # noqa: F401 — register User
    Base.metadata.create_all(bind=engine)
    print(f"[DB] Database ready: {DATABASE_URL.split('?')[0]}")
