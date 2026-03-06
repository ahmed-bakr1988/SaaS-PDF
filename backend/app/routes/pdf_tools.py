"""Extended PDF tool routes — Merge, Split, Rotate, Page Numbers, PDF↔Images, Watermark, Protect/Unlock."""
import os
import uuid

from flask import Blueprint, request, jsonify

from app.extensions import limiter
from app.utils.file_validator import validate_file, FileValidationError
from app.utils.sanitizer import generate_safe_path
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

    task_id = str(uuid.uuid4())
    input_paths = []
    original_filenames = []

    for f in files:
        try:
            original_filename, ext = validate_file(f, allowed_types=["pdf"])
        except FileValidationError as e:
            return jsonify({"error": e.message}), e.code

        upload_dir = os.path.join("/tmp/uploads", task_id)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{ext}")
        f.save(file_path)
        input_paths.append(file_path)
        original_filenames.append(original_filename)

    task = merge_pdfs_task.delay(input_paths, task_id, original_filenames)

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

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = split_pdf_task.delay(input_path, task_id, original_filename, mode, pages)

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

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = rotate_pdf_task.delay(input_path, task_id, original_filename, rotation, pages)

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

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = add_page_numbers_task.delay(
        input_path, task_id, original_filename, position, start_number
    )

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

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = pdf_to_images_task.delay(
        input_path, task_id, original_filename, output_format, dpi
    )

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

    task_id = str(uuid.uuid4())
    input_paths = []
    original_filenames = []

    for f in files:
        try:
            original_filename, ext = validate_file(f, allowed_types=ALLOWED_IMAGE_TYPES)
        except FileValidationError as e:
            return jsonify({"error": e.message}), e.code

        upload_dir = os.path.join("/tmp/uploads", task_id)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{ext}")
        f.save(file_path)
        input_paths.append(file_path)
        original_filenames.append(original_filename)

    task = images_to_pdf_task.delay(input_paths, task_id, original_filenames)

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

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = watermark_pdf_task.delay(
        input_path, task_id, original_filename, watermark_text, opacity
    )

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

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = protect_pdf_task.delay(input_path, task_id, original_filename, password)

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

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = unlock_pdf_task.delay(input_path, task_id, original_filename, password)

    return jsonify({
        "task_id": task.id,
        "message": "Unlock started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
