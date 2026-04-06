"""Routes for new PDF conversions — PDF↔PPTX, Excel→PDF, Sign PDF."""
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
from app.tasks.pdf_convert_tasks import (
    pdf_to_pptx_task,
    excel_to_pdf_task,
    pptx_to_pdf_task,
    sign_pdf_task,
)

pdf_convert_bp = Blueprint("pdf_convert", __name__)

ALLOWED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"]


# ---------------------------------------------------------------------------
# PDF to PowerPoint — POST /api/convert/pdf-to-pptx
# ---------------------------------------------------------------------------
@pdf_convert_bp.route("/pdf-to-pptx", methods=["POST"])
@limiter.limit("10/minute")
def pdf_to_pptx_route():
    """Convert a PDF to PowerPoint (PPTX)."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="pdf-to-pptx")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = pdf_to_pptx_task.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-to-pptx", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Excel to PDF — POST /api/convert/excel-to-pdf
# ---------------------------------------------------------------------------
@pdf_convert_bp.route("/excel-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def excel_to_pdf_route():
    """Convert an Excel file to PDF."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="excel-to-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["xlsx", "xls"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = excel_to_pdf_task.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "excel-to-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# PowerPoint to PDF — POST /api/convert/pptx-to-pdf
# ---------------------------------------------------------------------------
@pdf_convert_bp.route("/pptx-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def pptx_to_pdf_route():
    """Convert a PowerPoint file to PDF."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="pptx-to-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pptx", "ppt"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = pptx_to_pdf_task.delay(
        input_path, task_id, original_filename,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pptx-to-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


# ---------------------------------------------------------------------------
# Sign PDF — POST /api/convert/sign
# ---------------------------------------------------------------------------
@pdf_convert_bp.route("/sign", methods=["POST"])
@limiter.limit("10/minute")
def sign_pdf_route():
    """Sign a PDF by overlaying a signature image.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'signature': Signature image (PNG/JPG)
        - 'page' (optional): 1-based page number (default: 1)
        - 'x', 'y' (optional): Position in points (default: 100, 100)
        - 'width', 'height' (optional): Size in points (default: 200, 80)
    """
    if "file" not in request.files:
        return jsonify({"error": "No PDF file provided."}), 400
    if "signature" not in request.files:
        return jsonify({"error": "No signature image provided."}), 400

    pdf_file = request.files["file"]
    sig_file = request.files["signature"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="sign-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(pdf_file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    try:
        _, sig_ext = validate_actor_file(sig_file, allowed_types=ALLOWED_IMAGE_TYPES, actor=actor)
    except FileValidationError as e:
        return jsonify({"error": f"Signature image: {e.message}"}), e.code

    # Parse position parameters
    try:
        page = max(1, int(request.form.get("page", 1))) - 1  # Convert to 0-based
        x = float(request.form.get("x", 100))
        y = float(request.form.get("y", 100))
        width = float(request.form.get("width", 200))
        height = float(request.form.get("height", 80))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid position parameters."}), 400

    if width <= 0 or height <= 0:
        return jsonify({"error": "Width and height must be positive."}), 400

    task_id = str(uuid.uuid4())
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], task_id)
    os.makedirs(upload_dir, exist_ok=True)

    input_path = os.path.join(upload_dir, f"{uuid.uuid4()}.pdf")
    pdf_file.save(input_path)

    signature_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{sig_ext}")
    sig_file.save(signature_path)

    task = sign_pdf_task.delay(
        input_path, signature_path, task_id, original_filename,
        page, x, y, width, height,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "sign-pdf", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "Signing started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
