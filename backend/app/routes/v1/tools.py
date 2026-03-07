"""B2B API v1 tool routes — authenticated via X-API-Key, Pro plan only."""
import os
import uuid
import logging

from celery.result import AsyncResult
from flask import Blueprint, current_app, jsonify, request

from app.extensions import celery, limiter
from app.services.policy_service import (
    assert_quota_available,
    assert_api_task_access,
    build_task_tracking_kwargs,
    PolicyError,
    record_accepted_usage,
    resolve_api_actor,
    validate_actor_file,
)
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.tasks.compress_tasks import compress_pdf_task
from app.tasks.convert_tasks import convert_pdf_to_word, convert_word_to_pdf
from app.tasks.image_tasks import convert_image_task, resize_image_task
from app.tasks.video_tasks import create_gif_task
from app.tasks.pdf_tools_tasks import (
    merge_pdfs_task,
    split_pdf_task,
    rotate_pdf_task,
    add_page_numbers_task,
    pdf_to_images_task,
    images_to_pdf_task,
    watermark_pdf_task,
    protect_pdf_task,
    unlock_pdf_task,
)
from app.tasks.flowchart_tasks import extract_flowchart_task

logger = logging.getLogger(__name__)

v1_bp = Blueprint("v1", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]
ALLOWED_VIDEO_TYPES = ["mp4", "webm"]
ALLOWED_OUTPUT_FORMATS = ["jpg", "png", "webp"]


def _resolve_and_check() -> tuple:
    """Resolve API actor and assert quota. Returns (actor, error_response | None)."""
    try:
        actor = resolve_api_actor()
    except PolicyError as e:
        return None, (jsonify({"error": e.message}), e.status_code)

    try:
        assert_quota_available(actor)
    except PolicyError as e:
        return None, (jsonify({"error": e.message}), e.status_code)

    return actor, None


# ---------------------------------------------------------------------------
# Task status — GET /api/v1/tasks/<task_id>/status
# ---------------------------------------------------------------------------

@v1_bp.route("/tasks/<task_id>/status", methods=["GET"])
@limiter.limit("300/minute", override_defaults=True)
def get_task_status(task_id: str):
    """Poll the status of an async API task."""
    try:
        actor = resolve_api_actor()
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        assert_api_task_access(actor, task_id)
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    result = AsyncResult(task_id, app=celery)
    response: dict = {"task_id": task_id, "state": result.state}

    if result.state == "PENDING":
        response["progress"] = "Task is waiting in queue..."
    elif result.state == "PROCESSING":
        response["progress"] = (result.info or {}).get("step", "Processing...")
    elif result.state == "SUCCESS":
        response["result"] = result.result or {}
    elif result.state == "FAILURE":
        response["error"] = str(result.info) if result.info else "Task failed."

    return jsonify(response)


# ---------------------------------------------------------------------------
# Compress — POST /api/v1/compress/pdf
# ---------------------------------------------------------------------------

@v1_bp.route("/compress/pdf", methods=["POST"])
@limiter.limit("10/minute")
def compress_pdf_route():
    """Compress a PDF file."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    quality = request.form.get("quality", "medium")
    if quality not in ("low", "medium", "high"):
        quality = "medium"

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = compress_pdf_task.delay(
        input_path, task_id, original_filename, quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "compress-pdf", task.id)

    return jsonify({"task_id": task.id, "message": "Compression started."}), 202


# ---------------------------------------------------------------------------
# Convert — POST /api/v1/convert/pdf-to-word  &  /api/v1/convert/word-to-pdf
# ---------------------------------------------------------------------------

@v1_bp.route("/convert/pdf-to-word", methods=["POST"])
@limiter.limit("10/minute")
def pdf_to_word_route():
    """Convert a PDF to Word (DOCX)."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = convert_pdf_to_word.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-to-word", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


@v1_bp.route("/convert/word-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def word_to_pdf_route():
    """Convert a Word (DOC/DOCX) file to PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["doc", "docx"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = convert_word_to_pdf.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "word-to-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


# ---------------------------------------------------------------------------
# Image — POST /api/v1/image/convert  &  /api/v1/image/resize
# ---------------------------------------------------------------------------

@v1_bp.route("/image/convert", methods=["POST"])
@limiter.limit("10/minute")
def convert_image_route():
    """Convert an image to a different format."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    output_format = request.form.get("format", "").lower()
    if output_format not in ALLOWED_OUTPUT_FORMATS:
        return jsonify({"error": f"Invalid format. Supported: {', '.join(ALLOWED_OUTPUT_FORMATS)}"}), 400

    try:
        quality = max(1, min(100, int(request.form.get("quality", "85"))))
    except ValueError:
        quality = 85

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = convert_image_task.delay(
        input_path, task_id, original_filename, output_format, quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-convert", task.id)
    return jsonify({"task_id": task.id, "message": "Image conversion started."}), 202


@v1_bp.route("/image/resize", methods=["POST"])
@limiter.limit("10/minute")
def resize_image_route():
    """Resize an image."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        width = int(request.form.get("width")) if request.form.get("width") else None
        height = int(request.form.get("height")) if request.form.get("height") else None
    except ValueError:
        return jsonify({"error": "Width and height must be integers."}), 400

    if width is None and height is None:
        return jsonify({"error": "At least one of width or height is required."}), 400
    if width and not (1 <= width <= 10000):
        return jsonify({"error": "Width must be between 1 and 10000."}), 400
    if height and not (1 <= height <= 10000):
        return jsonify({"error": "Height must be between 1 and 10000."}), 400

    try:
        quality = max(1, min(100, int(request.form.get("quality", "85"))))
    except ValueError:
        quality = 85

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = resize_image_task.delay(
        input_path, task_id, original_filename, width, height, quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-resize", task.id)
    return jsonify({"task_id": task.id, "message": "Image resize started."}), 202


# ---------------------------------------------------------------------------
# Video — POST /api/v1/video/to-gif
# ---------------------------------------------------------------------------

@v1_bp.route("/video/to-gif", methods=["POST"])
@limiter.limit("5/minute")
def video_to_gif_route():
    """Convert a video clip to an animated GIF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        start_time = float(request.form.get("start_time", 0))
        duration = float(request.form.get("duration", 5))
        fps = int(request.form.get("fps", 10))
        width = int(request.form.get("width", 480))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid parameters. Must be numeric."}), 400

    if start_time < 0:
        return jsonify({"error": "Start time cannot be negative."}), 400
    if not (0 < duration <= 15):
        return jsonify({"error": "Duration must be between 0.5 and 15 seconds."}), 400
    if not (1 <= fps <= 20):
        return jsonify({"error": "FPS must be between 1 and 20."}), 400
    if not (100 <= width <= 640):
        return jsonify({"error": "Width must be between 100 and 640 pixels."}), 400

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_VIDEO_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = create_gif_task.delay(
        input_path, task_id, original_filename, start_time, duration, fps, width,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "video-to-gif", task.id)
    return jsonify({"task_id": task.id, "message": "GIF creation started."}), 202


# ---------------------------------------------------------------------------
# PDF Tools — all single-file and multi-file routes
# ---------------------------------------------------------------------------

@v1_bp.route("/pdf-tools/merge", methods=["POST"])
@limiter.limit("10/minute")
def merge_pdfs_route():
    """Merge multiple PDF files into one."""
    actor, err = _resolve_and_check()
    if err:
        return err

    files = request.files.getlist("files")
    if not files or len(files) < 2:
        return jsonify({"error": "Please upload at least 2 PDF files."}), 400
    if len(files) > 20:
        return jsonify({"error": "Maximum 20 files allowed."}), 400

    task_id = str(uuid.uuid4())
    input_paths, original_filenames = [], []
    for f in files:
        try:
            original_filename, ext = validate_actor_file(f, allowed_types=["pdf"], actor=actor)
        except FileValidationError as e:
            return jsonify({"error": e.message}), e.code
        upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], task_id)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{ext}")
        f.save(file_path)
        input_paths.append(file_path)
        original_filenames.append(original_filename)

    task = merge_pdfs_task.delay(
        input_paths, task_id, original_filenames,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "merge-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Merge started."}), 202


@v1_bp.route("/pdf-tools/split", methods=["POST"])
@limiter.limit("10/minute")
def split_pdf_route():
    """Split a PDF into pages or a range."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    mode = request.form.get("mode", "all")
    pages = request.form.get("pages")
    if mode not in ("all", "range"):
        mode = "all"
    if mode == "range" and not (pages and pages.strip()):
        return jsonify({"error": "Please specify which pages to extract."}), 400

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = split_pdf_task.delay(
        input_path, task_id, original_filename, mode, pages,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "split-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Split started."}), 202


@v1_bp.route("/pdf-tools/rotate", methods=["POST"])
@limiter.limit("10/minute")
def rotate_pdf_route():
    """Rotate pages in a PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        rotation = int(request.form.get("rotation", 90))
    except ValueError:
        rotation = 90
    if rotation not in (90, 180, 270):
        return jsonify({"error": "Rotation must be 90, 180, or 270 degrees."}), 400
    pages = request.form.get("pages", "all")

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = rotate_pdf_task.delay(
        input_path, task_id, original_filename, rotation, pages,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "rotate-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Rotation started."}), 202


@v1_bp.route("/pdf-tools/page-numbers", methods=["POST"])
@limiter.limit("10/minute")
def add_page_numbers_route():
    """Add page numbers to a PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    position = request.form.get("position", "bottom-center")
    valid_positions = [
        "bottom-center", "bottom-right", "bottom-left",
        "top-center", "top-right", "top-left",
    ]
    if position not in valid_positions:
        position = "bottom-center"
    try:
        start_number = max(1, int(request.form.get("start_number", 1)))
    except ValueError:
        start_number = 1

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = add_page_numbers_task.delay(
        input_path, task_id, original_filename, position, start_number,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "page-numbers", task.id)
    return jsonify({"task_id": task.id, "message": "Page numbering started."}), 202


@v1_bp.route("/pdf-tools/pdf-to-images", methods=["POST"])
@limiter.limit("10/minute")
def pdf_to_images_route():
    """Convert PDF pages to images."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    output_format = request.form.get("format", "png").lower()
    if output_format not in ("png", "jpg"):
        output_format = "png"
    try:
        dpi = max(72, min(600, int(request.form.get("dpi", 200))))
    except ValueError:
        dpi = 200

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = pdf_to_images_task.delay(
        input_path, task_id, original_filename, output_format, dpi,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-to-images", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


@v1_bp.route("/pdf-tools/images-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def images_to_pdf_route():
    """Convert multiple images to a single PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "Please upload at least 1 image."}), 400
    if len(files) > 50:
        return jsonify({"error": "Maximum 50 images allowed."}), 400

    task_id = str(uuid.uuid4())
    input_paths, original_filenames = [], []
    for f in files:
        try:
            original_filename, ext = validate_actor_file(
                f, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
            )
        except FileValidationError as e:
            return jsonify({"error": e.message}), e.code
        upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], task_id)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{ext}")
        f.save(file_path)
        input_paths.append(file_path)
        original_filenames.append(original_filename)

    task = images_to_pdf_task.delay(
        input_paths, task_id, original_filenames,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "images-to-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


@v1_bp.route("/pdf-tools/watermark", methods=["POST"])
@limiter.limit("10/minute")
def watermark_pdf_route():
    """Add a text watermark to a PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    watermark_text = request.form.get("text", "").strip()
    if not watermark_text:
        return jsonify({"error": "Watermark text is required."}), 400
    if len(watermark_text) > 100:
        return jsonify({"error": "Watermark text must be 100 characters or less."}), 400
    try:
        opacity = max(0.1, min(1.0, float(request.form.get("opacity", 0.3))))
    except ValueError:
        opacity = 0.3

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = watermark_pdf_task.delay(
        input_path, task_id, original_filename, watermark_text, opacity,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "watermark-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Watermarking started."}), 202


@v1_bp.route("/pdf-tools/protect", methods=["POST"])
@limiter.limit("10/minute")
def protect_pdf_route():
    """Add password protection to a PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    password = request.form.get("password", "").strip()
    if not password:
        return jsonify({"error": "Password is required."}), 400
    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters."}), 400

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = protect_pdf_task.delay(
        input_path, task_id, original_filename, password,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "protect-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Protection started."}), 202


@v1_bp.route("/pdf-tools/unlock", methods=["POST"])
@limiter.limit("10/minute")
def unlock_pdf_route():
    """Remove password protection from a PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    password = request.form.get("password", "").strip()
    if not password:
        return jsonify({"error": "Password is required."}), 400

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = unlock_pdf_task.delay(
        input_path, task_id, original_filename, password,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "unlock-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Unlock started."}), 202


@v1_bp.route("/flowchart/extract", methods=["POST"])
@limiter.limit("10/minute")
def extract_flowchart_route():
    """Extract procedures from a PDF and generate flowcharts."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext)
    file.save(input_path)
    task = extract_flowchart_task.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-flowchart", task.id)
    return jsonify({"task_id": task.id, "message": "Flowchart extraction started."}), 202
