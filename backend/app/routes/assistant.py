"""Site assistant routes — global AI helper for the product UI."""
import json

from flask import Blueprint, Response, jsonify, request, stream_with_context

from app.extensions import limiter
from app.services.policy_service import resolve_web_actor
from app.services.site_assistant_service import chat_with_site_assistant, stream_site_assistant_chat

assistant_bp = Blueprint("assistant", __name__)


def _parse_chat_payload():
    payload = request.get_json(silent=True) or {}

    message = str(payload.get("message", "")).strip()
    if not message:
        return None, (jsonify({"error": "Message is required."}), 400)

    if len(message) > 4000:
        return None, (jsonify({"error": "Message is too long."}), 400)

    actor = resolve_web_actor()
    return {
        "message": message,
        "session_id": str(payload.get("session_id", "")).strip() or None,
        "fingerprint": str(payload.get("fingerprint", "")).strip() or "anonymous",
        "tool_slug": str(payload.get("tool_slug", "")).strip(),
        "page_url": str(payload.get("page_url", "")).strip(),
        "locale": str(payload.get("locale", "en")).strip() or "en",
        "user_id": actor.user_id,
        "history": payload.get("history") if isinstance(payload.get("history"), list) else None,
    }, None


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=True)}\n\n"


@assistant_bp.route("/chat", methods=["POST"])
@limiter.limit("20/minute")
def assistant_chat_route():
    """Answer a product-help message and store the conversation for later analysis."""
    chat_kwargs, error_response = _parse_chat_payload()
    if error_response:
        return error_response

    try:
        result = chat_with_site_assistant(**chat_kwargs)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Assistant is temporarily unavailable."}), 500

    return jsonify(result), 200


@assistant_bp.route("/chat/stream", methods=["POST"])
@limiter.limit("20/minute")
def assistant_chat_stream_route():
    """Stream assistant replies incrementally over SSE."""
    chat_kwargs, error_response = _parse_chat_payload()
    if error_response:
        return error_response

    try:
        events = stream_site_assistant_chat(**chat_kwargs)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Assistant is temporarily unavailable."}), 500

    def generate():
        for event in events:
            yield _sse(event["event"], event["data"])

    return Response(
        stream_with_context(generate()),
        content_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )