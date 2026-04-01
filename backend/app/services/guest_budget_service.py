"""Guest demo budget enforcement.

Anonymous visitors get a small usage budget tracked by IP address
via Redis (with Flask session fallback).  The budget prevents abuse
of expensive tools before the download-gate forces registration.
"""

import os
from flask import request, session

from app.services.credit_config import GUEST_DEMO_BUDGET, GUEST_DEMO_TTL_HOURS

_TTL_SECONDS = GUEST_DEMO_TTL_HOURS * 3600


# ── Redis helpers ──────────────────────────────────────────────
def _get_redis():
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return redis.Redis.from_url(redis_url, decode_responses=True)
    except Exception:
        return None


def _guest_redis_key(ip: str) -> str:
    return f"guest_demo:{ip}"


def _get_client_ip() -> str:
    """Return the best-effort client IP for rate tracking."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


# ── Public API ─────────────────────────────────────────────────

def get_guest_remaining() -> int:
    """Return how many demo operations the current guest has left."""
    ip = _get_client_ip()
    r = _get_redis()

    if r is not None:
        try:
            used = r.get(_guest_redis_key(ip))
            if used is None:
                return GUEST_DEMO_BUDGET
            return max(0, GUEST_DEMO_BUDGET - int(str(used)))
        except Exception:
            pass

    # Fallback: Flask session
    used = session.get("guest_demo_used", 0)
    return max(0, GUEST_DEMO_BUDGET - used)


def record_guest_usage() -> None:
    """Increment the guest demo counter for the current visitor."""
    ip = _get_client_ip()
    r = _get_redis()

    if r is not None:
        try:
            key = _guest_redis_key(ip)
            pipe = r.pipeline()
            pipe.incr(key)
            pipe.expire(key, _TTL_SECONDS)
            pipe.execute()
            return
        except Exception:
            pass

    # Fallback: Flask session
    session["guest_demo_used"] = session.get("guest_demo_used", 0) + 1


def assert_guest_budget_available() -> None:
    """Raise ValueError if the guest has exhausted their demo budget."""
    remaining = get_guest_remaining()
    if remaining <= 0:
        raise ValueError(
            "You have used all your free demo tries. "
            "Create a free account to continue."
        )
