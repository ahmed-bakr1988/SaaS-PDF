"""Tool ratings routes — collect and serve user feedback per tool."""
from flask import Blueprint, request, jsonify

from app.extensions import limiter
from app.services.rating_service import (
    submit_rating,
    get_tool_rating_summary,
    get_all_ratings_summary,
)

rating_bp = Blueprint("rating", __name__)


@rating_bp.route("/submit", methods=["POST"])
@limiter.limit("30/hour")
def submit_rating_route():
    """
    Submit a rating for a tool.

    Accepts JSON:
        - tool (str): tool slug e.g. "compress-pdf"
        - rating (int): 1-5 stars
        - feedback (str, optional): short text feedback
        - tag (str, optional): predefined tag like "fast", "accurate", "issue"
    """
    data = request.get_json(silent=True) or {}

    tool = (data.get("tool") or "").strip()
    rating = data.get("rating")
    feedback = (data.get("feedback") or "").strip()[:500]  # max 500 chars
    tag = (data.get("tag") or "").strip()[:50]

    if not tool:
        return jsonify({"error": "Tool slug is required."}), 400

    if not isinstance(rating, (int, float)) or not (1 <= int(rating) <= 5):
        return jsonify({"error": "Rating must be an integer between 1 and 5."}), 400

    rating = int(rating)
    fingerprint = _get_fingerprint(request)

    submit_rating(
        tool=tool,
        rating=rating,
        feedback=feedback,
        tag=tag,
        fingerprint=fingerprint,
    )

    return jsonify({"message": "Thank you for your feedback!"}), 201


@rating_bp.route("/tool/<tool_slug>", methods=["GET"])
@limiter.limit("60/minute")
def get_tool_rating(tool_slug: str):
    """Return the aggregate rating summary for one tool."""
    summary = get_tool_rating_summary(tool_slug)
    return jsonify(summary)


@rating_bp.route("/all", methods=["GET"])
@limiter.limit("20/minute")
def get_all_ratings():
    """Return rating summaries for all tools."""
    summaries = get_all_ratings_summary()
    return jsonify({"tools": summaries})


def _get_fingerprint(req) -> str:
    """Build a simple fingerprint from IP + User-Agent to limit duplicate ratings."""
    import hashlib

    ip = req.remote_addr or "unknown"
    ua = req.headers.get("User-Agent", "unknown")
    raw = f"{ip}:{ua}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]
