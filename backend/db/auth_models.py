"""
Auth models — User table
"""

from __future__ import annotations

from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import String, Boolean, DateTime, Integer, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base


class UserRole:
    USER   = "user"
    LAWYER = "lawyer"
    ADMIN  = "admin"


class User(Base):
    __tablename__ = "users"

    id:              Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    email:           Mapped[str]           = mapped_column(String(255), unique=True, nullable=False, index=True)
    # Nullable so OAuth users (Google etc.) don't need a password
    hashed_password: Mapped[str | None]   = mapped_column(String(255), nullable=True)
    full_name:       Mapped[str]           = mapped_column(String(200), nullable=False)
    role:            Mapped[str]           = mapped_column(String(20), default=UserRole.USER)
    is_active:       Mapped[bool]          = mapped_column(Boolean, default=True)
    is_verified:     Mapped[bool]          = mapped_column(Boolean, default=False)
    # OAuth fields
    auth_provider:   Mapped[str]           = mapped_column(String(20), default="email")   # "email" | "google"
    google_id:       Mapped[str | None]   = mapped_column(String(128), nullable=True, unique=True, index=True)
    # Timestamps
    last_login:      Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at:      Mapped[datetime]       = mapped_column(DateTime, server_default=func.now())

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role}, {self.auth_provider})>"


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id:         Mapped[int]       = mapped_column(Integer, primary_key=True, autoincrement=True)
    email:      Mapped[str]       = mapped_column(String(255), nullable=False, index=True)
    code:       Mapped[str]       = mapped_column(String(6), nullable=False)
    purpose:    Mapped[str]       = mapped_column(String(20), default="google_2fa")
    used:       Mapped[bool]      = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime]  = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime]  = mapped_column(DateTime, server_default=func.now())
