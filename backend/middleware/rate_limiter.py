"""
Rate limiting middleware.

Backends
--------
Redis (preferred)  : shared across every uvicorn worker and survives restarts.
In-memory fallback : per-process only. Fine for local dev, NOT for production
                     -- core.config refuses to boot prod without REDIS_URL.

Uses a fixed-window counter keyed on the client IP. The Redis path is atomic
(INCR + EXPIRE in a pipeline), so concurrent workers cannot race past the limit.
"""

from __future__ import annotations

import time
import json
import logging
from collections import defaultdict
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Never rate limit health checks, docs, or CORS preflight.
EXEMPT_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json")


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 60, period: int = 60, redis_url: Optional[str] = None):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self._memory: dict = defaultdict(list)
        self._redis = None

        if redis_url:
            try:
                import redis  # type: ignore

                client = redis.Redis.from_url(redis_url, socket_connect_timeout=2)
                client.ping()
                self._redis = client
                logger.info("Rate limiter: using Redis at %s", redis_url)
            except Exception as exc:
                # Never take the API down because Redis is unreachable; degrade.
                logger.warning(
                    "Rate limiter: Redis unavailable (%s). Falling back to in-memory "
                    "(per-process only).", exc,
                )

        if self._redis is None:
            logger.warning(
                "Rate limiter: in-memory backend active. Limits are NOT shared "
                "across workers and reset on restart. Set REDIS_URL for real limiting."
            )

    # -- Client identity --------------------------------------------------------
    def _client_id(self, request: Request) -> str:
        # Honour X-Forwarded-For so limiting still works behind nginx/compose,
        # where request.client.host would otherwise be the proxy for everyone.
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    # -- Backends ---------------------------------------------------------------
    def _hit_redis(self, key: str) -> int:
        window = int(time.time()) // self.period
        redis_key = f"ratelimit:{key}:{window}"
        pipe = self._redis.pipeline()
        pipe.incr(redis_key, 1)
        pipe.expire(redis_key, self.period + 1)
        count, _ = pipe.execute()
        return int(count)

    def _hit_memory(self, key: str) -> int:
        now = time.time()
        window_start = now - self.period
        bucket = [t for t in self._memory[key] if t > window_start]
        bucket.append(now)
        self._memory[key] = bucket

        # Bound memory: the old version grew a dict entry per IP forever, which
        # is a slow leak (and trivial to blow up via spoofed XFF headers).
        if len(self._memory) > 10_000:
            for k in [k for k, v in list(self._memory.items()) if not v or max(v) < window_start]:
                del self._memory[k]
        return len(bucket)

    # -- Dispatch ---------------------------------------------------------------
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path.startswith(EXEMPT_PREFIXES):
            return await call_next(request)

        key = self._client_id(request)

        try:
            count = self._hit_redis(key) if self._redis else self._hit_memory(key)
        except Exception as exc:
            # A broken limiter must fail open, not 500 the entire API.
            logger.error("Rate limiter error, allowing request: %s", exc)
            return await call_next(request)

        remaining = max(0, self.calls - count)

        if count > self.calls:
            retry_after = self.period - (int(time.time()) % self.period)
            return Response(
                content=json.dumps({"detail": "Too many requests. Please slow down."}),
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.calls),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        # Let clients self-throttle instead of guessing.
        response.headers["X-RateLimit-Limit"] = str(self.calls)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
