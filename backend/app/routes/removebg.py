"""Background removal route."""
import os

from flask import Blueprint, request, jsonify, current_app

from app.extensions import limiter
from app.services.policy_service import (
    assert_quota_available,
    build_task_tracking_kwargs,
    PolicyError,
    record_accepted_usage,
    resolve_web_actor,
    validate_actor_file,
)
from app.services.quote_service import create_quote, QuoteError
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.utils.task_queue import enqueue_task

removebg_bp = Blueprint("removebg", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]


@removebg_bp.route("", methods=["POST"])
@limiter.limit("5/minute")
def remove_bg_route():
    """Remove the background from an image.

    Accepts: multipart/form-data with:
        - 'file': Image file (PNG, JPG, JPEG, WebP)
    Returns: JSON with task_id for polling
    """
    if not current_app.config.get("FEATURE_REMOVEBG", True):
        return jsonify({"error": "This feature is not enabled."}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="remove-bg")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    file_size_kb = os.path.getsize(input_path) / 1024
    try:
        quote = create_quote(actor.user_id, actor.plan, "remove-bg", file_size_kb=file_size_kb)
    except QuoteError as e:
        return jsonify({"error": e.message}), e.status_code

    task = enqueue_task(
        "app.tasks.removebg_tasks.remove_bg_task",
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "remove-bg", task.id, quote=quote)

    return jsonify({
        "task_id": task.id,
        "message": "Background removal started. Poll /api/tasks/{task_id}/status for progress.",
        "quote": quote.to_dict(),
    }), 202
