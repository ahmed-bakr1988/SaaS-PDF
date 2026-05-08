"""Extended PDF tool routes — Merge, Split, Rotate, Page Numbers, PDF↔Images, Watermark, Protect/Unlock."""
import os
import uuid

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
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.utils.task_queue import enqueue_task

pdf_tools_bp = Blueprint("pdf_tools", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]


# ---------------------------------------------------------------------------
# Merge PDFs  — POST /api/pdf-tools/merge
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/merge", methods=["POST"])
@limiter.limit("10/minute")
def merge_pdfs_route():
    """
    Merge multiple PDF files into one.

    Accepts: multipart/form-data with multiple 'files' fields (PDF)
    Returns: JSON with task_id for polling
    """
    files = request.files.getlist("files")
    if not files or len(files) < 2:
        return jsonify({"error": "Please upload at least 2 PDF files."}), 400

    if len(files) > 20:
        return jsonify({"error": "Maximum 20 files allowed."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="merge-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    task_id = str(uuid.uuid4())
    input_paths = []
    original_filenames = []

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

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.merge_pdfs_task",
        input_paths,
        task_id,
        original_filenames,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "merge-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Merge started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Split PDF  — POST /api/pdf-tools/split
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/split", methods=["POST"])
@limiter.limit("10/minute")
def split_pdf_route():
    """
    Split a PDF into individual pages or a specific range.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'mode' (optional): "all" or "range" (default: "all")
        - 'pages' (optional): Page spec for range mode, e.g. "1,3,5-8"
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    mode = request.form.get("mode", "all")
    pages = request.form.get("pages")

    if mode not in ("all", "range"):
        mode = "all"

    if mode == "range" and (not pages or not pages.strip()):
        return jsonify({
            "error": "Please specify which pages to extract (e.g. 1,3,5-8)."
        }), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="split-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.split_pdf_task",
        input_path,
        task_id,
        original_filename,
        mode,
        pages,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "split-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Split started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Rotate PDF  — POST /api/pdf-tools/rotate
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/rotate", methods=["POST"])
@limiter.limit("10/minute")
def rotate_pdf_route():
    """
    Rotate pages in a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'rotation': Degrees — 90, 180, or 270 (default: 90)
        - 'pages' (optional): "all" or comma-separated page numbers (default: "all")
    Returns: JSON with task_id for polling
    """
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

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="rotate-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.rotate_pdf_task",
        input_path,
        task_id,
        original_filename,
        rotation,
        pages,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "rotate-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Rotation started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Add Page Numbers  — POST /api/pdf-tools/page-numbers
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/page-numbers", methods=["POST"])
@limiter.limit("10/minute")
def add_page_numbers_route():
    """
    Add page numbers to a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'position' (optional): "bottom-center", "bottom-right", "bottom-left",
                                  "top-center", "top-right", "top-left" (default: "bottom-center")
        - 'start_number' (optional): Starting number (default: 1)
    Returns: JSON with task_id for polling
    """
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

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="page-numbers")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.add_page_numbers_task",
        input_path,
        task_id,
        original_filename,
        position,
        start_number,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "page-numbers", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Page numbering started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# PDF to Images  — POST /api/pdf-tools/pdf-to-images
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/pdf-to-images", methods=["POST"])
@limiter.limit("10/minute")
def pdf_to_images_route():
    """
    Convert PDF pages to images.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'format' (optional): "png" or "jpg" (default: "png")
        - 'dpi' (optional): Resolution 72-600 (default: 200)
    Returns: JSON with task_id for polling
    """
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

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="pdf-to-images")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.pdf_to_images_task",
        input_path,
        task_id,
        original_filename,
        output_format,
        dpi,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-to-images", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Images to PDF  — POST /api/pdf-tools/images-to-pdf
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/images-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def images_to_pdf_route():
    """
    Convert multiple images to a single PDF.

    Accepts: multipart/form-data with multiple 'files' fields (images)
    Returns: JSON with task_id for polling
    """
    files = request.files.getlist("files")
    if not files or len(files) < 1:
        return jsonify({"error": "Please upload at least 1 image."}), 400

    if len(files) > 50:
        return jsonify({"error": "Maximum 50 images allowed."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="images-to-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    task_id = str(uuid.uuid4())
    input_paths = []
    original_filenames = []

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

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.images_to_pdf_task",
        input_paths,
        task_id,
        original_filenames,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "images-to-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Watermark PDF  — POST /api/pdf-tools/watermark
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/watermark", methods=["POST"])
@limiter.limit("10/minute")
def watermark_pdf_route():
    """
    Add a text watermark to a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'text': Watermark text
        - 'opacity' (optional): 0.1-1.0 (default: 0.3)
    Returns: JSON with task_id for polling
    """
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

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="watermark-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.watermark_pdf_task",
        input_path,
        task_id,
        original_filename,
        watermark_text,
        opacity,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "watermark-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Watermarking started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Protect PDF  — POST /api/pdf-tools/protect
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/protect", methods=["POST"])
@limiter.limit("10/minute")
def protect_pdf_route():
    """
    Add password protection to a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'password': Password to set
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    password = request.form.get("password", "").strip()

    if not password:
        return jsonify({"error": "Password is required."}), 400

    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="protect-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.protect_pdf_task",
        input_path,
        task_id,
        original_filename,
        password,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "protect-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Protection started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Unlock PDF  — POST /api/pdf-tools/unlock
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/unlock", methods=["POST"])
@limiter.limit("10/minute")
def unlock_pdf_route():
    """
    Remove password protection from a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'password': Current password of the PDF
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    password = request.form.get("password", "").strip()

    if not password:
        return jsonify({"error": "Password is required."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="unlock-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.unlock_pdf_task",
        input_path,
        task_id,
        original_filename,
        password,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "unlock-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Unlock started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Remove Watermark  — POST /api/pdf-tools/remove-watermark
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/remove-watermark", methods=["POST"])
@limiter.limit("10/minute")
def remove_watermark_route():
    """
    Remove watermark from a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="remove-watermark")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.remove_watermark_task",
        input_path,
        task_id,
        original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "remove-watermark", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Watermark removal started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Reorder PDF Pages  — POST /api/pdf-tools/reorder
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/reorder", methods=["POST"])
@limiter.limit("10/minute")
def reorder_pdf_route():
    """
    Reorder pages in a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'page_order': Comma-separated page numbers in desired order (e.g. "3,1,2")
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    page_order_str = request.form.get("page_order", "").strip()

    if not page_order_str:
        return jsonify({"error": "Page order is required (e.g. '3,1,2')."}), 400

    try:
        page_order = [int(p.strip()) for p in page_order_str.split(",") if p.strip()]
    except ValueError:
        return jsonify({"error": "Invalid page order. Use comma-separated numbers (e.g. '3,1,2')."}), 400

    if not page_order:
        return jsonify({"error": "Page order is required."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="reorder-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.reorder_pdf_task",
        input_path,
        task_id,
        original_filename,
        page_order,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "reorder-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Reorder started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Extract Pages  — POST /api/pdf-tools/extract-pages
# ---------------------------------------------------------------------------
@pdf_tools_bp.route("/extract-pages", methods=["POST"])
@limiter.limit("10/minute")
def extract_pages_route():
    """
    Extract specific pages from a PDF into a new PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'pages': Page specification (e.g. "1,3,5-8")
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    pages = request.form.get("pages", "").strip()

    if not pages:
        return jsonify({"error": "Pages specification is required (e.g. '1,3,5-8')."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="extract-pages")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = enqueue_task(
        "app.tasks.pdf_tools_tasks.extract_pages_task",
        input_path,
        task_id,
        original_filename,
        pages,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "extract-pages", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Page extraction started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
