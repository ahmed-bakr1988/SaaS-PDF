"""AI model registry route — exposes available OpenRouter models to the frontend."""

from flask import Blueprint, jsonify

from app.extensions import limiter

ai_models_bp = Blueprint("ai_models", __name__)


@ai_models_bp.route("", methods=["GET"])
@limiter.limit("30/minute")
def list_ai_models():
    """Return cached list of available OpenRouter models.

    Response:
        {
            "models": [
                {
                    "id": "openai/gpt-4o-mini",
                    "name": "GPT-4o mini",
                    "is_free": false,
                    "estimated_credits_per_page": 8,
                    "description": "..."
                },
                ...
            ]
        }
    """
    try:
        from app.services.openrouter_models_service import (
            get_cached_models,
            estimate_credits_for_translate,
        )

        models = get_cached_models()
        payload = [
            {
                "id": m.id,
                "name": m.name,
                "is_free": m.is_free,
                "estimated_credits_per_page": estimate_credits_for_translate(m.id, pages=1),
                "description": m.description,
            }
            for m in models
        ]
        # Sort: free models first, then by name
        payload.sort(key=lambda x: (not x["is_free"], x["name"].lower()))
        return jsonify({"models": payload})
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Failed to fetch AI models: %s", exc)
        return jsonify({"models": []})
