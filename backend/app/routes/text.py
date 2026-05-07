"""Routes for text analysis tools."""

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.social_text_service import (
    SocialTextValidationError,
    analyze_social_text,
)

text_bp = Blueprint("text", __name__)


@text_bp.route("/social-analyzer", methods=["POST"])
@limiter.limit("30/minute")
def social_analyzer_route():
    """Analyze text for social media publishing readiness."""
    body = request.get_json(silent=True) or {}
    text = body.get("text", "")

    if not isinstance(text, str):
        return jsonify({"error": "Text must be a string."}), 400

    try:
        analysis = analyze_social_text(text)
    except SocialTextValidationError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(analysis), 200
