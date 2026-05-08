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
from app.utils.task_queue import named_task_proxy
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.services.barcode_service import SUPPORTED_BARCODE_TYPES
from app.services.html_to_pdf_service import parse_html_to_pdf_render_options

logger = logging.getLogger(__name__)

v1_bp = Blueprint("v1", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]
ALLOWED_VIDEO_TYPES = ["mp4", "webm"]
ALLOWED_OUTPUT_FORMATS = ["jpg", "png", "webp"]

compress_pdf_task = named_task_proxy("app.tasks.compress_tasks.compress_pdf_task")
convert_pdf_to_word = named_task_proxy("app.tasks.convert_tasks.convert_pdf_to_word")
convert_word_to_pdf = named_task_proxy("app.tasks.convert_tasks.convert_word_to_pdf")
convert_image_task = named_task_proxy("app.tasks.image_tasks.convert_image_task")
resize_image_task = named_task_proxy("app.tasks.image_tasks.resize_image_task")
create_gif_task = named_task_proxy("app.tasks.video_tasks.create_gif_task")
merge_pdfs_task = named_task_proxy("app.tasks.pdf_tools_tasks.merge_pdfs_task")
split_pdf_task = named_task_proxy("app.tasks.pdf_tools_tasks.split_pdf_task")
rotate_pdf_task = named_task_proxy("app.tasks.pdf_tools_tasks.rotate_pdf_task")
add_page_numbers_task = named_task_proxy("app.tasks.pdf_tools_tasks.add_page_numbers_task")
pdf_to_images_task = named_task_proxy("app.tasks.pdf_tools_tasks.pdf_to_images_task")
images_to_pdf_task = named_task_proxy("app.tasks.pdf_tools_tasks.images_to_pdf_task")
watermark_pdf_task = named_task_proxy("app.tasks.pdf_tools_tasks.watermark_pdf_task")
protect_pdf_task = named_task_proxy("app.tasks.pdf_tools_tasks.protect_pdf_task")
unlock_pdf_task = named_task_proxy("app.tasks.pdf_tools_tasks.unlock_pdf_task")
extract_flowchart_task = named_task_proxy("app.tasks.flowchart_tasks.extract_flowchart_task")
ocr_image_task = named_task_proxy("app.tasks.ocr_tasks.ocr_image_task")
ocr_pdf_task = named_task_proxy("app.tasks.ocr_tasks.ocr_pdf_task")
remove_bg_task = named_task_proxy("app.tasks.removebg_tasks.remove_bg_task")
chat_with_pdf_task = named_task_proxy("app.tasks.pdf_ai_tasks.chat_with_pdf_task")
summarize_pdf_task = named_task_proxy("app.tasks.pdf_ai_tasks.summarize_pdf_task")
translate_pdf_task = named_task_proxy("app.tasks.pdf_ai_tasks.translate_pdf_task")
extract_tables_task = named_task_proxy("app.tasks.pdf_ai_tasks.extract_tables_task")
pdf_to_excel_task = named_task_proxy("app.tasks.pdf_to_excel_tasks.pdf_to_excel_task")
html_to_pdf_task = named_task_proxy("app.tasks.html_to_pdf_tasks.html_to_pdf_task")
generate_qr_task = named_task_proxy("app.tasks.qrcode_tasks.generate_qr_task")
pdf_to_pptx_task = named_task_proxy("app.tasks.pdf_convert_tasks.pdf_to_pptx_task")
excel_to_pdf_task = named_task_proxy("app.tasks.pdf_convert_tasks.excel_to_pdf_task")
pptx_to_pdf_task = named_task_proxy("app.tasks.pdf_convert_tasks.pptx_to_pdf_task")
sign_pdf_task = named_task_proxy("app.tasks.pdf_convert_tasks.sign_pdf_task")
crop_pdf_task = named_task_proxy("app.tasks.pdf_extra_tasks.crop_pdf_task")
flatten_pdf_task = named_task_proxy("app.tasks.pdf_extra_tasks.flatten_pdf_task")
repair_pdf_task = named_task_proxy("app.tasks.pdf_extra_tasks.repair_pdf_task")
edit_metadata_task = named_task_proxy("app.tasks.pdf_extra_tasks.edit_metadata_task")
crop_image_task = named_task_proxy("app.tasks.image_extra_tasks.crop_image_task")
rotate_flip_image_task = named_task_proxy("app.tasks.image_extra_tasks.rotate_flip_image_task")
generate_barcode_task = named_task_proxy("app.tasks.barcode_tasks.generate_barcode_task")


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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = compress_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        quality,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = convert_pdf_to_word.delay(
        input_path,
        task_id,
        original_filename,
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
        input_path,
        task_id,
        original_filename,
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
        return jsonify(
            {"error": f"Invalid format. Supported: {', '.join(ALLOWED_OUTPUT_FORMATS)}"}
        ), 400

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
        input_path,
        task_id,
        original_filename,
        output_format,
        quality,
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
        input_path,
        task_id,
        original_filename,
        width,
        height,
        quality,
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
        input_path,
        task_id,
        original_filename,
        start_time,
        duration,
        fps,
        width,
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
            original_filename, ext = validate_actor_file(
                f, allowed_types=["pdf"], actor=actor
            )
        except FileValidationError as e:
            return jsonify({"error": e.message}), e.code
        upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], task_id)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{ext}")
        f.save(file_path)
        input_paths.append(file_path)
        original_filenames.append(original_filename)

    task = merge_pdfs_task.delay(
        input_paths,
        task_id,
        original_filenames,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = split_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        mode,
        pages,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = rotate_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        rotation,
        pages,
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
        "bottom-center",
        "bottom-right",
        "bottom-left",
        "top-center",
        "top-right",
        "top-left",
    ]
    if position not in valid_positions:
        position = "bottom-center"
    try:
        start_number = max(1, int(request.form.get("start_number", 1)))
    except ValueError:
        start_number = 1

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = add_page_numbers_task.delay(
        input_path,
        task_id,
        original_filename,
        position,
        start_number,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = pdf_to_images_task.delay(
        input_path,
        task_id,
        original_filename,
        output_format,
        dpi,
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
        input_paths,
        task_id,
        original_filenames,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = watermark_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        watermark_text,
        opacity,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = protect_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        password,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = unlock_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        password,
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
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext)
    file.save(input_path)
    task = extract_flowchart_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-flowchart", task.id)
    return jsonify(
        {"task_id": task.id, "message": "Flowchart extraction started."}
    ), 202


# ===========================================================================
# Phase 2: Previously uncovered existing tools
# ===========================================================================

# ---------------------------------------------------------------------------
# OCR — POST /api/v1/ocr/image  &  /api/v1/ocr/pdf
# ---------------------------------------------------------------------------


@v1_bp.route("/ocr/image", methods=["POST"])
@limiter.limit("10/minute")
def ocr_image_route():
    """Extract text from an image using OCR."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    lang = request.form.get("lang", "eng")

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = ocr_image_task.delay(
        input_path,
        task_id,
        original_filename,
        lang,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "ocr-image", task.id)
    return jsonify({"task_id": task.id, "message": "OCR started."}), 202


@v1_bp.route("/ocr/pdf", methods=["POST"])
@limiter.limit("10/minute")
def ocr_pdf_route():
    """Extract text from a PDF using OCR."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    lang = request.form.get("lang", "eng")

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = ocr_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        lang,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "ocr-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "OCR started."}), 202


# ---------------------------------------------------------------------------
# Remove Background — POST /api/v1/image/remove-bg
# ---------------------------------------------------------------------------


@v1_bp.route("/image/remove-bg", methods=["POST"])
@limiter.limit("5/minute")
def remove_bg_route():
    """Remove background from an image."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = remove_bg_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "remove-bg", task.id)
    return jsonify({"task_id": task.id, "message": "Background removal started."}), 202


# ---------------------------------------------------------------------------
# PDF AI — POST /api/v1/pdf-ai/chat, summarize, translate, extract-tables
# ---------------------------------------------------------------------------


@v1_bp.route("/pdf-ai/chat", methods=["POST"])
@limiter.limit("5/minute")
def chat_pdf_route():
    """Chat with a PDF using AI."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    question = request.form.get("question", "").strip()
    if not question:
        return jsonify({"error": "Question is required."}), 400

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = chat_with_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        question,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "chat-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Chat started."}), 202


@v1_bp.route("/pdf-ai/summarize", methods=["POST"])
@limiter.limit("5/minute")
def summarize_pdf_route():
    """Summarize a PDF using AI."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    length = request.form.get("length", "medium")
    if length not in ("short", "medium", "long"):
        length = "medium"

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = summarize_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        length,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "summarize-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Summarization started."}), 202


@v1_bp.route("/pdf-ai/translate", methods=["POST"])
@limiter.limit("5/minute")
def translate_pdf_route():
    """Translate a PDF using AI."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    target_language = request.form.get("target_language", "").strip()
    source_language = request.form.get("source_language", "auto").strip()
    if not target_language:
        return jsonify({"error": "Target language is required."}), 400

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = translate_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        target_language,
        source_language,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "translate-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Translation started."}), 202


@v1_bp.route("/pdf-ai/extract-tables", methods=["POST"])
@limiter.limit("10/minute")
def extract_tables_route():
    """Extract tables from a PDF using AI."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = extract_tables_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "extract-tables", task.id)
    return jsonify({"task_id": task.id, "message": "Table extraction started."}), 202


# ---------------------------------------------------------------------------
# PDF to Excel — POST /api/v1/convert/pdf-to-excel
# ---------------------------------------------------------------------------


@v1_bp.route("/convert/pdf-to-excel", methods=["POST"])
@limiter.limit("10/minute")
def pdf_to_excel_route():
    """Convert a PDF to Excel."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = pdf_to_excel_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-to-excel", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


# ---------------------------------------------------------------------------
# HTML to PDF — POST /api/v1/convert/html-to-pdf
# ---------------------------------------------------------------------------


@v1_bp.route("/convert/html-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def html_to_pdf_route():
    """Convert HTML to PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["html", "htm", "zip"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    try:
        render_options = parse_html_to_pdf_render_options(request.form, ext)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = html_to_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        render_options=render_options.to_payload(),
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "html-to-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


# ---------------------------------------------------------------------------
# QR Code — POST /api/v1/qrcode/generate
# ---------------------------------------------------------------------------


@v1_bp.route("/qrcode/generate", methods=["POST"])
@limiter.limit("20/minute")
def generate_qr_route():
    """Generate a QR code."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if request.is_json:
        body = request.get_json()
        data = body.get("data", "")
        size = body.get("size", 300)
    else:
        data = request.form.get("data", "")
        size = request.form.get("size", 300)

    if not str(data).strip():
        return jsonify({"error": "QR code data is required."}), 400

    try:
        size = max(100, min(2000, int(size)))
    except (ValueError, TypeError):
        size = 300

    task_id = str(uuid.uuid4())
    task = generate_qr_task.delay(
        task_id,
        str(data).strip(),
        size,
        "png",
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "qr-code", task.id)
    return jsonify({"task_id": task.id, "message": "QR code generation started."}), 202


# ===========================================================================
# Phase 2: New tools
# ===========================================================================

# ---------------------------------------------------------------------------
# PDF to PowerPoint — POST /api/v1/convert/pdf-to-pptx
# ---------------------------------------------------------------------------


@v1_bp.route("/convert/pdf-to-pptx", methods=["POST"])
@limiter.limit("10/minute")
def v1_pdf_to_pptx_route():
    """Convert a PDF to PowerPoint."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = pdf_to_pptx_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-to-pptx", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


# ---------------------------------------------------------------------------
# Excel to PDF — POST /api/v1/convert/excel-to-pdf
# ---------------------------------------------------------------------------


@v1_bp.route("/convert/excel-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def v1_excel_to_pdf_route():
    """Convert an Excel file to PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["xlsx", "xls"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = excel_to_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "excel-to-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


# ---------------------------------------------------------------------------
# PowerPoint to PDF — POST /api/v1/convert/pptx-to-pdf
# ---------------------------------------------------------------------------


@v1_bp.route("/convert/pptx-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def v1_pptx_to_pdf_route():
    """Convert a PowerPoint file to PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pptx", "ppt"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = pptx_to_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pptx-to-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Conversion started."}), 202


# ---------------------------------------------------------------------------
# Sign PDF — POST /api/v1/pdf-tools/sign
# ---------------------------------------------------------------------------


@v1_bp.route("/pdf-tools/sign", methods=["POST"])
@limiter.limit("10/minute")
def v1_sign_pdf_route():
    """Sign a PDF with a signature image."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No PDF file provided."}), 400
    if "signature" not in request.files:
        return jsonify({"error": "No signature image provided."}), 400

    pdf_file = request.files["file"]
    sig_file = request.files["signature"]

    try:
        original_filename, ext = validate_actor_file(
            pdf_file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    try:
        _, sig_ext = validate_actor_file(
            sig_file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": f"Signature: {e.message}"}), e.code

    try:
        page = max(1, int(request.form.get("page", 1))) - 1
        x = float(request.form.get("x", 100))
        y = float(request.form.get("y", 100))
        width = float(request.form.get("width", 200))
        height = float(request.form.get("height", 80))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid position parameters."}), 400

    task_id = str(uuid.uuid4())
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], task_id)
    os.makedirs(upload_dir, exist_ok=True)
    input_path = os.path.join(upload_dir, f"{uuid.uuid4()}.pdf")
    pdf_file.save(input_path)
    signature_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{sig_ext}")
    sig_file.save(signature_path)

    task = sign_pdf_task.delay(
        input_path,
        signature_path,
        task_id,
        original_filename,
        page,
        x,
        y,
        width,
        height,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "sign-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Signing started."}), 202


# ---------------------------------------------------------------------------
# Crop PDF — POST /api/v1/pdf-tools/crop
# ---------------------------------------------------------------------------


@v1_bp.route("/pdf-tools/crop", methods=["POST"])
@limiter.limit("10/minute")
def v1_crop_pdf_route():
    """Crop margins from a PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        margin_left = float(request.form.get("margin_left", 0))
        margin_right = float(request.form.get("margin_right", 0))
        margin_top = float(request.form.get("margin_top", 0))
        margin_bottom = float(request.form.get("margin_bottom", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Margin values must be numbers."}), 400

    pages = request.form.get("pages", "all")
    crop_x_pct = request.form.get("crop_x_pct")
    crop_y_pct = request.form.get("crop_y_pct")
    crop_width_pct = request.form.get("crop_width_pct")
    crop_height_pct = request.form.get("crop_height_pct")

    try:
        crop_x_pct = float(crop_x_pct) if crop_x_pct is not None else None
        crop_y_pct = float(crop_y_pct) if crop_y_pct is not None else None
        crop_width_pct = float(crop_width_pct) if crop_width_pct is not None else None
        crop_height_pct = float(crop_height_pct) if crop_height_pct is not None else None
    except (ValueError, TypeError):
        return jsonify({"error": "Crop box values must be numbers."}), 400

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = crop_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        margin_left,
        margin_right,
        margin_top,
        margin_bottom,
        pages,
        crop_x_pct,
        crop_y_pct,
        crop_width_pct,
        crop_height_pct,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "crop-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Cropping started."}), 202


# ---------------------------------------------------------------------------
# Flatten PDF — POST /api/v1/pdf-tools/flatten
# ---------------------------------------------------------------------------


@v1_bp.route("/pdf-tools/flatten", methods=["POST"])
@limiter.limit("10/minute")
def v1_flatten_pdf_route():
    """Flatten a PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = flatten_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "flatten-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Flattening started."}), 202


# ---------------------------------------------------------------------------
# Repair PDF — POST /api/v1/pdf-tools/repair
# ---------------------------------------------------------------------------


@v1_bp.route("/pdf-tools/repair", methods=["POST"])
@limiter.limit("10/minute")
def v1_repair_pdf_route():
    """Repair a damaged PDF."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = repair_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "repair-pdf", task.id)
    return jsonify({"task_id": task.id, "message": "Repair started."}), 202


# ---------------------------------------------------------------------------
# Edit PDF Metadata — POST /api/v1/pdf-tools/metadata
# ---------------------------------------------------------------------------


@v1_bp.route("/pdf-tools/metadata", methods=["POST"])
@limiter.limit("10/minute")
def v1_edit_metadata_route():
    """Edit PDF metadata."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    title = request.form.get("title")
    author = request.form.get("author")
    subject = request.form.get("subject")
    keywords = request.form.get("keywords")
    creator = request.form.get("creator")

    if not any([title, author, subject, keywords, creator]):
        return jsonify({"error": "At least one metadata field required."}), 400

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = edit_metadata_task.delay(
        input_path,
        task_id,
        original_filename,
        title,
        author,
        subject,
        keywords,
        creator,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "edit-metadata", task.id)
    return jsonify({"task_id": task.id, "message": "Metadata editing started."}), 202


# ---------------------------------------------------------------------------
# Image Crop — POST /api/v1/image/crop
# ---------------------------------------------------------------------------


@v1_bp.route("/image/crop", methods=["POST"])
@limiter.limit("10/minute")
def v1_crop_image_route():
    """Crop an image."""
    actor, err = _resolve_and_check()
    if err:
        return err

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
        return jsonify({"error": "Invalid crop area."}), 400

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = crop_image_task.delay(
        input_path,
        task_id,
        original_filename,
        left,
        top,
        right,
        bottom,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-crop", task.id)
    return jsonify({"task_id": task.id, "message": "Cropping started."}), 202


# ---------------------------------------------------------------------------
# Image Rotate/Flip — POST /api/v1/image/rotate-flip
# ---------------------------------------------------------------------------


@v1_bp.route("/image/rotate-flip", methods=["POST"])
@limiter.limit("10/minute")
def v1_rotate_flip_image_route():
    """Rotate and/or flip an image."""
    actor, err = _resolve_and_check()
    if err:
        return err

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    try:
        rotation = int(request.form.get("rotation", 0))
    except ValueError:
        rotation = 0
    if rotation not in (0, 90, 180, 270):
        return jsonify({"error": "Rotation must be 0, 90, 180, or 270."}), 400

    flip_horizontal = request.form.get("flip_horizontal", "false").lower() == "true"
    flip_vertical = request.form.get("flip_vertical", "false").lower() == "true"

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)
    task = rotate_flip_image_task.delay(
        input_path,
        task_id,
        original_filename,
        rotation,
        flip_horizontal,
        flip_vertical,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "image-rotate-flip", task.id)
    return jsonify({"task_id": task.id, "message": "Transformation started."}), 202


# ---------------------------------------------------------------------------
# Barcode — POST /api/v1/barcode/generate
# ---------------------------------------------------------------------------


@v1_bp.route("/barcode/generate", methods=["POST"])
@limiter.limit("20/minute")
def v1_generate_barcode_route():
    """Generate a barcode."""
    actor, err = _resolve_and_check()
    if err:
        return err

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

    if barcode_type not in SUPPORTED_BARCODE_TYPES:
        return jsonify(
            {
                "error": f"Unsupported type. Supported: {', '.join(SUPPORTED_BARCODE_TYPES)}"
            }
        ), 400

    if output_format not in ("png", "svg"):
        output_format = "png"

    task_id = str(uuid.uuid4())
    task = generate_barcode_task.delay(
        data,
        barcode_type,
        task_id,
        output_format,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "barcode", task.id)
    return jsonify({"task_id": task.id, "message": "Barcode generation started."}), 202
