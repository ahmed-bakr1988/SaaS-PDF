"""PDF Editor route — apply text annotations to PDFs."""
import json

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
from app.tasks.pdf_editor_tasks import edit_pdf_task

pdf_editor_bp = Blueprint("pdf_editor", __name__)


@pdf_editor_bp.route("/edit", methods=["POST"])
@limiter.limit("10/minute")
def edit_pdf_route():
    """Apply text annotations to a PDF.

    Accepts: multipart/form-data with:
        - 'file': PDF file
        - 'edits': JSON string — array of edit objects
          Each edit: { type: "text", page: 1, x: 100, y: 200, content: "Hello", fontSize: 14, color: "#000000" }
    Returns: JSON with task_id for polling
    """
    if not current_app.config.get("FEATURE_EDITOR", False):
        return jsonify({"error": "This feature is not enabled."}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    edits_raw = request.form.get("edits", "[]")

    try:
        edits = json.loads(edits_raw)
        if not isinstance(edits, list):
            return jsonify({"error": "Edits must be a JSON array."}), 400
    except (json.JSONDecodeError, TypeError):
        return jsonify({"error": "Invalid JSON in 'edits' field."}), 400

    if not edits:
        return jsonify({"error": "At least one edit is required."}), 400

    if len(edits) > 500:
        return jsonify({"error": "Maximum 500 edits allowed."}), 400

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

    task = edit_pdf_task.delay(
        input_path, task_id, original_filename, edits,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-edit", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "PDF editing started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
