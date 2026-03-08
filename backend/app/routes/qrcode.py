"""QR code generation routes."""
import uuid

from flask import Blueprint, request, jsonify

from app.extensions import limiter
from app.services.policy_service import (
    assert_quota_available,
    build_task_tracking_kwargs,
    PolicyError,
    record_accepted_usage,
    resolve_web_actor,
)
from app.tasks.qrcode_tasks import generate_qr_task

qrcode_bp = Blueprint("qrcode", __name__)


@qrcode_bp.route("/generate", methods=["POST"])
@limiter.limit("20/minute")
def generate_qr_route():
    """
    Generate a QR code from text or URL.

    Accepts: JSON or form-data with:
        - 'data': Text/URL to encode
        - 'size' (optional): Image size 100-2000 (default: 300)
    Returns: JSON with task_id for polling
    """
    if request.is_json:
        body = request.get_json(silent=True) or {}
        data = body.get("data", "")
        size = body.get("size", 300)
    else:
        data = request.form.get("data", "")
        size = request.form.get("size", "300")

    if not data or not str(data).strip():
        return jsonify({"error": "No data provided for QR code."}), 400

    try:
        size = max(100, min(2000, int(size)))
    except (ValueError, TypeError):
        size = 300

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor)
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    task_id = str(uuid.uuid4())

    task = generate_qr_task.delay(
        task_id,
        str(data).strip(),
        size,
        "png",
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "qr-code", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "QR code generation started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
