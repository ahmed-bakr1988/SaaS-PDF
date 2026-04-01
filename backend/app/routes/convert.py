"""PDF conversion routes (PDF↔Word)."""
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
from app.tasks.convert_tasks import convert_pdf_to_word, convert_word_to_pdf

convert_bp = Blueprint("convert", __name__)


@convert_bp.route("/pdf-to-word", methods=["POST"])
@limiter.limit("10/minute")
def pdf_to_word_route():
    """
    Convert a PDF file to Word (DOCX).

    Accepts: multipart/form-data with 'file' field (PDF)
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="pdf-to-word")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
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

    return jsonify({
        "task_id": task.id,
        "message": "Conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


@convert_bp.route("/word-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def word_to_pdf_route():
    """
    Convert a Word (DOC/DOCX) file to PDF.

    Accepts: multipart/form-data with 'file' field (DOC/DOCX)
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="word-to-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

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

    return jsonify({
        "task_id": task.id,
        "message": "Conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
