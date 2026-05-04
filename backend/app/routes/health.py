"""Health check endpoint."""
import os
import logging
from flask import Blueprint, jsonify, current_app
from redis import Redis

from app.extensions import limiter
from app.utils.database import db_connection, execute_query

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
@limiter.exempt
def health_check():
    """Simple health check — returns 200 if the service, DB, and Redis are running."""
    errors = []

    # 1. Check Database
    try:
        with db_connection() as conn:
            execute_query(conn, "SELECT 1")
    except Exception as e:
        logger.error(f"Health check failed (Database): {e}")
        errors.append("Database connection failed")

    # 2. Check Redis
    try:
        redis_url = current_app.config.get("CELERY_BROKER_URL", "redis://redis:6379/0")
        r = Redis.from_url(redis_url, socket_timeout=2)
        r.ping()
    except Exception as e:
        logger.error(f"Health check failed (Redis): {e}")
        errors.append("Redis connection failed")

    if errors:
        return jsonify({
            "status": "unhealthy",
            "service": "Dociva API",
            "errors": errors
        }), 500

    return jsonify({
        "status": "healthy",
        "service": "Dociva API",
        "version": "1.0.0",
    })
