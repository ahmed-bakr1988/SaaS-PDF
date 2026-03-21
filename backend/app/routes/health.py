"""Health check endpoint."""
from flask import Blueprint, jsonify

from app.extensions import limiter

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
@limiter.exempt
def health_check():
    """Simple health check — returns 200 if the service is running."""
    return jsonify({
        "status": "healthy",
        "service": "Dociva API",
        "version": "1.0.0",
    })
