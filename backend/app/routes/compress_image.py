"""Image compression routes."""
import os

from flask import Blueprint, request, jsonify

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

compress_image_bp = Blueprint("compress_image", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]


@compress_image_bp.route("/compress", methods=["POST"])
@limiter.limit("10/minute")
def compress_image_route():
    """
    Compress an image file.

    Accepts: multipart/form-data with:
        - 'file': Image file (PNG, JPG, JPEG, WebP)
        - 'quality' (optional): Quality 1-100 (default: 75)
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    quality = request.form.get("quality", "75")

    try:
        quality = max(1, min(100, int(quality)))
    except ValueError:
        quality = 75

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="compress-image")
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
        quote = create_quote(actor.user_id, actor.plan, "compress-image", file_size_kb=file_size_kb)
    except QuoteError as e:
        return jsonify({"error": e.message}), e.status_code

    task = enqueue_task(
        "app.tasks.compress_image_tasks.compress_image_task",
        input_path,
        task_id,
        original_filename,
        quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "compress-image", task.id, quote=quote)

    return jsonify({
        "task_id": task.id,
        "message": "Image compression started. Poll /api/tasks/{task_id}/status for progress.",
        "quote": quote.to_dict(),
    }), 202
