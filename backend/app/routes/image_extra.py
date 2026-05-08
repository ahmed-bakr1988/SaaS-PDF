"""Routes for image extra tools — Crop, Rotate/Flip."""
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
from app.utils.task_queue import enqueue_task

image_extra_bp = Blueprint("image_extra", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]


# ---------------------------------------------------------------------------
# Image Crop — POST /api/image/crop
# ---------------------------------------------------------------------------
@image_extra_bp.route("/crop", methods=["POST"])
@limiter.limit("10/minute")
def crop_image_route():
    """Crop an image to specified dimensions.

    Accepts: multipart/form-data with:
        - 'file': Image file
        - 'left', 'top', 'right', 'bottom': Crop rectangle in pixels
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    try:
        left = int(request.form.get("left", 0))
        top = int(request.form.get("top", 0))
        right = int(request.form.get("right", 0))
        bottom = int(request.form.get("bottom", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Crop dimensions must be integers."}), 400

    if right <= left or bottom <= top:
        return jsonify({"error": "Invalid crop area: right > left and bottom > top required."}), 400

    try:
        quality = max(1, min(100, int(request.form.get("quality", 85))))
    except ValueError:
        quality = 85

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="image-crop")
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

    task = enqueue_task(
        "app.tasks.image_extra_tasks.crop_image_task",
        input_path, task_id, original_filename,
        left, top, right, bottom, quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-crop", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Cropping started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Image Rotate/Flip — POST /api/image/rotate-flip
# ---------------------------------------------------------------------------
@image_extra_bp.route("/rotate-flip", methods=["POST"])
@limiter.limit("10/minute")
def rotate_flip_image_route():
    """Rotate and/or flip an image.

    Accepts: multipart/form-data with:
        - 'file': Image file
        - 'rotation' (optional): 0, 90, 180, or 270 (default: 0)
        - 'flip_horizontal' (optional): "true"/"false" (default: false)
        - 'flip_vertical' (optional): "true"/"false" (default: false)
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    try:
        rotation = int(request.form.get("rotation", 0))
    except ValueError:
        rotation = 0
    if rotation not in (0, 90, 180, 270):
        return jsonify({"error": "Rotation must be 0, 90, 180, or 270 degrees."}), 400

    flip_horizontal = request.form.get("flip_horizontal", "false").lower() == "true"
    flip_vertical = request.form.get("flip_vertical", "false").lower() == "true"

    if rotation == 0 and not flip_horizontal and not flip_vertical:
        return jsonify({"error": "At least one transformation is required."}), 400

    try:
        quality = max(1, min(100, int(request.form.get("quality", 85))))
    except ValueError:
        quality = 85

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="image-rotate-flip")
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

    task = enqueue_task(
        "app.tasks.image_extra_tasks.rotate_flip_image_task",
        input_path, task_id, original_filename,
        rotation, flip_horizontal, flip_vertical, quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-rotate-flip", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Transformation started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
