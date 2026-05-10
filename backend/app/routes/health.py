"""Health check endpoints for Docker and uptime monitoring.

Provides two probes:
  GET /api/health/live  — Liveness:  is the process running?
  GET /api/health       — Readiness: are all dependencies available?

The /health route is used by Nginx's proxy_pass and Docker
health checks. It must respond in < 3s to avoid false failures.
"""

import logging
import time

from flask import Blueprint, jsonify, current_app
from redis import Redis

from app.extensions import limiter
from app.utils.database import db_connection, execute_query

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)

# Cached readiness result to avoid hammering DB/Redis on every probe.
# Cache is invalidated after CACHE_TTL_SECONDS to detect late failures.
_READY_CACHE: dict = {}
_CACHE_TTL_SECONDS = 10


def _redis_is_optional(redis_url: str) -> bool:
    """Return True when the current runtime intentionally avoids Redis."""
    normalized = (redis_url or "").strip().lower()
    return normalized.startswith("memory://") or normalized.startswith("cache+memory://")


def _check_db(errors: list) -> None:
    """Run a trivial DB query to verify connectivity. Appends to errors on failure."""
    try:
        with db_connection() as conn:
            execute_query(conn, "SELECT 1")
    except Exception as exc:
        logger.error("Health check — DB failed: %s", exc)
        errors.append("database_unreachable")


def _check_redis(errors: list) -> None:
    """Ping Redis to verify connectivity. Appends to errors on failure."""
    try:
        redis_url = current_app.config.get("CELERY_BROKER_URL", "redis://redis:6379/0")
        if not _redis_is_optional(redis_url):
            r = Redis.from_url(redis_url, socket_timeout=2, socket_connect_timeout=2)
            r.ping()
    except Exception as exc:
        logger.error("Health check — Redis failed: %s", exc)
        errors.append("redis_unreachable")


# ─────────────────────────────────────────────────────────────────────────────
# Liveness probe
# Used by Docker healthcheck to decide whether to restart the container.
# Must NEVER fail unless the process is truly broken (e.g. deadlock).
# ─────────────────────────────────────────────────────────────────────────────
@health_bp.route("/health/live", methods=["GET"])
@limiter.exempt
def health_live():
    """Liveness probe — is the process alive?"""
    return jsonify({
        "status": "alive",
        "service": "Dociva API",
        "version": "1.0.0",
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# Readiness probe
# Used by Nginx proxy_pass and uptime monitors.
# Returns 503 when any critical dependency is unavailable.
# Results are cached for CACHE_TTL_SECONDS to avoid probe storms.
# ─────────────────────────────────────────────────────────────────────────────
@health_bp.route("/health", methods=["GET"])
@limiter.exempt
def health_check():
    """Readiness probe — are all dependencies available?"""
    global _READY_CACHE

    now = time.monotonic()
    cached = _READY_CACHE

    # Serve cached result within TTL to absorb high-frequency probes
    if cached and (now - cached.get("ts", 0)) < _CACHE_TTL_SECONDS:
        return jsonify(cached["body"]), cached["code"]

    errors: list[str] = []
    _check_db(errors)
    _check_redis(errors)

    if errors:
        body = {
            "status": "unhealthy",
            "service": "Dociva API",
            "errors": errors,
        }
        code = 503
    else:
        body = {
            "status": "healthy",
            "service": "Dociva API",
            "version": "1.0.0",
        }
        code = 200

    _READY_CACHE = {"ts": now, "body": body, "code": code}
    return jsonify(body), code
