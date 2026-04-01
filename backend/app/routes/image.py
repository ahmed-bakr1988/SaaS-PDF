"""Image processing routes."""
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
from app.tasks.image_tasks import convert_image_task, resize_image_task, convert_image_to_svg_task

image_bp = Blueprint("image", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]
ALLOWED_OUTPUT_FORMATS = ["jpg", "png", "webp"]
ALLOWED_SVG_COLOR_MODES = ["color", "binary"]


@image_bp.route("/convert", methods=["POST"])
@limiter.limit("10/minute")
def convert_image_route():
    """
    Convert an image to a different format.

    Accepts: multipart/form-data with:
        - 'file': Image file (PNG, JPG, JPEG, WebP)
        - 'format': Target format ("jpg", "png", "webp")
        - 'quality' (optional): Quality 1-100 (default: 85)
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    output_format = request.form.get("format", "").lower()
    quality = request.form.get("quality", "85")

    # Validate output format
    if output_format not in ALLOWED_OUTPUT_FORMATS:
        return jsonify({
            "error": f"Invalid format. Supported: {', '.join(ALLOWED_OUTPUT_FORMATS)}"
        }), 400

    # Validate quality
    try:
        quality = max(1, min(100, int(quality)))
    except ValueError:
        quality = 85

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="image-convert")
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

    task = convert_image_task.delay(
        input_path,
        task_id,
        original_filename,
        output_format,
        quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-convert", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Image conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


@image_bp.route("/resize", methods=["POST"])
@limiter.limit("10/minute")
def resize_image_route():
    """
    Resize an image.

    Accepts: multipart/form-data with:
        - 'file': Image file
        - 'width' (optional): Target width
        - 'height' (optional): Target height
        - 'quality' (optional): Quality 1-100 (default: 85)
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    width = request.form.get("width")
    height = request.form.get("height")
    quality = request.form.get("quality", "85")

    # Validate dimensions
    try:
        width = int(width) if width else None
        height = int(height) if height else None
    except ValueError:
        return jsonify({"error": "Width and height must be integers."}), 400

    if width is None and height is None:
        return jsonify({"error": "At least one of width or height is required."}), 400

    if width and (width < 1 or width > 10000):
        return jsonify({"error": "Width must be between 1 and 10000."}), 400
    if height and (height < 1 or height > 10000):
        return jsonify({"error": "Height must be between 1 and 10000."}), 400

    try:
        quality = max(1, min(100, int(quality)))
    except ValueError:
        quality = 85

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="image-resize")
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

    task = resize_image_task.delay(
        input_path,
        task_id,
        original_filename,
        width,
        height,
        quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-resize", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Image resize started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


@image_bp.route("/to-svg", methods=["POST"])
@limiter.limit("10/minute")
def convert_image_to_svg_route():
    """
    Convert a raster image to SVG vector format.

    Accepts: multipart/form-data with:
        - 'file': Image file (PNG, JPG, JPEG, WebP)
        - 'color_mode' (optional): "color" or "binary" (default: "color")
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    color_mode = request.form.get("color_mode", "color").lower()

    if color_mode not in ALLOWED_SVG_COLOR_MODES:
        color_mode = "color"

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="image-to-svg")
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

    task = convert_image_to_svg_task.delay(
        input_path,
        task_id,
        original_filename,
        color_mode,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-to-svg", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Image to SVG conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
