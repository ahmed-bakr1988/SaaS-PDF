"""Public site-level statistics for social proof and developer pages."""
from flask import Blueprint, jsonify

from app.extensions import limiter
from app.services.account_service import get_public_history_summary
from app.services.rating_service import get_global_rating_summary

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/summary", methods=["GET"])
@limiter.limit("120/hour")
def get_stats_summary_route():
    """Return aggregate processing and rating stats safe for public display."""
    history_summary = get_public_history_summary()
    rating_summary = get_global_rating_summary()
    return jsonify({**history_summary, **rating_summary}), 200