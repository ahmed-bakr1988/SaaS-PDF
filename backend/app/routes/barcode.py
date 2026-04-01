"""Routes for barcode generation."""
from flask import Blueprint, request, jsonify

from app.extensions import limiter
from app.services.policy_service import (
    assert_quota_available,
    build_task_tracking_kwargs,
    PolicyError,
    record_accepted_usage,
    resolve_web_actor,
)
from app.services.barcode_service import SUPPORTED_BARCODE_TYPES
from app.tasks.barcode_tasks import generate_barcode_task
from app.utils.sanitizer import generate_safe_path

barcode_bp = Blueprint("barcode", __name__)


@barcode_bp.route("/generate", methods=["POST"])
@limiter.limit("20/minute")
def generate_barcode_route():
    """Generate a barcode image.

    Accepts: JSON or form data with:
        - 'data': String to encode
        - 'type' (optional): Barcode type (default: code128)
        - 'format' (optional): "png" or "svg" (default: png)
    """
    if request.is_json:
        body = request.get_json()
        data = body.get("data", "").strip()
        barcode_type = body.get("type", "code128").lower()
        output_format = body.get("format", "png").lower()
    else:
        data = request.form.get("data", "").strip()
        barcode_type = request.form.get("type", "code128").lower()
        output_format = request.form.get("format", "png").lower()

    if not data:
        return jsonify({"error": "Barcode data is required."}), 400

    if len(data) > 200:
        return jsonify({"error": "Barcode data is too long (max 200 characters)."}), 400

    if barcode_type not in SUPPORTED_BARCODE_TYPES:
        return jsonify({
            "error": f"Unsupported barcode type. Supported: {', '.join(SUPPORTED_BARCODE_TYPES)}"
        }), 400

    if output_format not in ("png", "svg"):
        output_format = "png"

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="barcode")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    task_id, _ = generate_safe_path("tmp", folder_type="upload")

    task = generate_barcode_task.delay(
        data, barcode_type, task_id, output_format,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "barcode", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Barcode generation started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
