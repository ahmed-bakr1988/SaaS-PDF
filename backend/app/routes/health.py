"""Health check endpoint."""
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Simple health check — returns 200 if the service is running."""
    return jsonify({
        "status": "healthy",
        "service": "Dociva API",
        "version": "1.0.0",
    })
