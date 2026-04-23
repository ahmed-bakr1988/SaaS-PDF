"""HTML to PDF conversion routes."""
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
from app.services.html_to_pdf_service import parse_html_to_pdf_render_options
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.tasks.html_to_pdf_tasks import html_to_pdf_task

html_to_pdf_bp = Blueprint("html_to_pdf", __name__)


@html_to_pdf_bp.route("/html-to-pdf", methods=["POST"])
@limiter.limit("10/minute")
def html_to_pdf_route():
    """
    Convert an HTML file to PDF.

    Accepts: multipart/form-data with:
        - 'file': HTML file or ZIP bundle containing HTML + assets
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="html-to-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

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

    return jsonify({
        "task_id": task.id,
        "message": "HTML to PDF conversion started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
