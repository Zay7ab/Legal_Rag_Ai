"""
Centralised configuration + fail-fast startup validation.

Every secret in the app is resolved here exactly once, so there is a single
place to audit. Import `settings` anywhere; call `settings.validate()` on
startup to refuse to boot with an insecure configuration.
"""

from __future__ import annotations

import os
import secrets
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load .env HERE, not in main.py.
#
# Settings() reads os.environ at import time, and main.py imports routers before
# it calls load_dotenv() -- those routers pull in core.config transitively, so
# Settings was constructed from a pre-dotenv environment and every value in
# .env was silently ignored. The symptom is nasty: you set JWT_SECRET_KEY
# correctly, and production still refuses to start claiming it is unset.
#
# Owning the load here makes it impossible to get the order wrong, however this
# module is imported. override=False so a real environment variable (docker
# compose, CI, systemd) still beats the file.
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_FILE if _ENV_FILE.exists() else None, override=False)
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)  # backend/.env too

# Values that must never reach a live deployment.
PLACEHOLDER_SECRETS = {
    "change_this_to_a_random_32_character_string_in_production",
    "change_this_in_production_32chars",
    "changeme",
    "secret",
    "your_groq_api_key_here",
}


class ConfigError(RuntimeError):
    """Raised at startup when configuration is unsafe or incomplete."""


def _csv(name: str, default: str = "") -> List[str]:
    return [p.strip() for p in os.getenv(name, default).split(",") if p.strip()]


@dataclass
class Settings:
    env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development").lower())

    # ── Auth ───────────────────────────────────────────────────────────────────
    jwt_secret_key: str = field(default_factory=lambda: os.getenv("JWT_SECRET_KEY", "").strip())
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = field(
        default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    )
    refresh_token_expire_days: int = field(
        default_factory=lambda: int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    )

    # Bootstrap super-admin. Only used to *promote* on first login; all
    # authorisation decisions are made against User.role, never this value.
    admin_email: str = field(
        default_factory=lambda: os.getenv("ADMIN_EMAIL", "").lower().strip()
    )

    # ── Infra ──────────────────────────────────────────────────────────────────
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./legalai.db")
    )
    redis_url: str = field(default_factory=lambda: os.getenv("REDIS_URL", "").strip())
    cors_origins: List[str] = field(
        default_factory=lambda: _csv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    )

    rate_limit_calls: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_CALLS", "120")))
    rate_limit_period: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_PERIOD", "60")))

    @property
    def is_production(self) -> bool:
        return self.env in ("production", "prod", "staging")

    # ── Validation ─────────────────────────────────────────────────────────────
    def validate(self) -> None:
        """
        Fail fast on insecure config. In production this raises; in development
        it warns loudly and substitutes safe ephemeral values so `uvicorn` still
        starts for a new contributor who has not written a .env yet.
        """
        problems: List[str] = []

        if not self.jwt_secret_key:
            problems.append("JWT_SECRET_KEY is not set.")
        elif self.jwt_secret_key in PLACEHOLDER_SECRETS:
            problems.append(
                "JWT_SECRET_KEY is still the placeholder from .env.example. "
                "Anyone can forge tokens. Generate one with: "
                "python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        elif len(self.jwt_secret_key) < 32:
            problems.append(
                f"JWT_SECRET_KEY is only {len(self.jwt_secret_key)} chars; use at least 32."
            )

        if self.is_production:
            if "*" in self.cors_origins:
                problems.append("CORS_ORIGINS must not be '*' with allow_credentials=True.")
            if any(o.startswith("http://") and "localhost" not in o for o in self.cors_origins):
                problems.append("CORS_ORIGINS contains a plaintext http:// non-localhost origin.")
            if self.database_url.startswith("sqlite"):
                problems.append("SQLite is not supported in production; set a PostgreSQL DATABASE_URL.")
            if not self.redis_url:
                problems.append("REDIS_URL is required in production for shared rate limiting.")

        if not problems:
            return

        if self.is_production:
            raise ConfigError(
                "Refusing to start — insecure configuration:\n  - " + "\n  - ".join(problems)
            )

        for p in problems:
            logger.warning("CONFIG: %s", p)

        if not self.jwt_secret_key or self.jwt_secret_key in PLACEHOLDER_SECRETS:
            # Ephemeral dev key: random per process, so tokens die on restart.
            # That is intentional and strictly better than a known-public key.
            self.jwt_secret_key = secrets.token_hex(32)
            logger.warning(
                "CONFIG: using a random ephemeral JWT_SECRET_KEY for this dev process. "
                "All sessions will be invalidated on restart. Set JWT_SECRET_KEY to stop this."
            )


settings = Settings()
