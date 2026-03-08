"""PDF to Excel conversion routes."""
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
from app.tasks.pdf_to_excel_tasks import pdf_to_excel_task

pdf_to_excel_bp = Blueprint("pdf_to_excel", __name__)


@pdf_to_excel_bp.route("/pdf-to-excel", methods=["POST"])
@limiter.limit("10/minute")
def pdf_to_excel_route():
    """
    Convert a PDF containing tables to an Excel file.

    Accepts: multipart/form-data with:
        - 'file': PDF file
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor)
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

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

    return jsonify({
        "task_id": task.id,
        "message": "PDF to Excel conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
