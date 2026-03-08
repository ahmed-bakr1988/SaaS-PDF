"""Image compression routes."""
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
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.tasks.compress_image_tasks import compress_image_task

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
        assert_quota_available(actor)
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

    task = compress_image_task.delay(
        input_path,
        task_id,
        original_filename,
        quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "compress-image", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Image compression started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
