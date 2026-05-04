"""PDF Editor route — apply visual annotations (text, shapes, images) to PDFs.

This blueprint exposes a single POST endpoint that accepts a PDF file and
a JSON array of edit operations.  The actual editing is delegated to a
Celery background task so the response returns immediately with a task ID
the client can poll for progress.
"""
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

# All edit operation types accepted by the backend service.
_VALID_EDIT_TYPES = {"text", "rect", "ellipse", "line", "arrow", "image", "link", "note"}

# Maximum total size (bytes) of all embedded data-URLs across all edits.
_MAX_TOTAL_DATA_URL_BYTES = 50 * 1024 * 1024  # 50 MB


def _validate_edit_object(edit: dict, index: int) -> str | None:
    """Validate a single edit operation dictionary.

    Checks for required keys (``type``, ``page``) and ensures values
    are within acceptable bounds.

    Args:
        edit: The edit dict to validate.
        index: The zero-based index of this edit in the array (for error messages).

    Returns:
        An error message string if validation fails, or ``None`` if valid.
    """
    if not isinstance(edit, dict):
        return f"Edit #{index + 1} must be a JSON object."

    edit_type = edit.get("type", "")
    if not isinstance(edit_type, str) or edit_type.strip().lower() not in _VALID_EDIT_TYPES:
        return f"Edit #{index + 1} has invalid type '{edit_type}'."

    page = edit.get("page")
    if page is None:
        return f"Edit #{index + 1} is missing the 'page' field."
    try:
        page_int = int(page)
        if page_int < 1:
            return f"Edit #{index + 1} has invalid page number {page_int}."
    except (TypeError, ValueError):
        return f"Edit #{index + 1} has non-numeric page value '{page}'."

    return None


def _validate_data_url_budget(edits: list[dict]) -> str | None:
    """Ensure the combined size of all embedded data-URLs doesn't exceed
    the safety limit.

    Args:
        edits: The list of edit operation dicts.

    Returns:
        An error message if the budget is exceeded, or ``None``.
    """
    total = 0
    for edit in edits:
        data_url = edit.get("data_url")
        if isinstance(data_url, str):
            total += len(data_url)
            if total > _MAX_TOTAL_DATA_URL_BYTES:
                return "Total embedded image data exceeds the allowed limit (50 MB)."
    return None


@pdf_editor_bp.route("/edit", methods=["POST"])
@limiter.limit("10/minute")
def edit_pdf_route():
    """Apply visual annotations to a PDF.

    **Request:** ``multipart/form-data``

    Form fields:
        file (FileStorage):
            The source PDF file (max 20 MB, enforced by policy).
        edits (str):
            A JSON-encoded array of edit operation objects.  Each object
            must contain at least ``type`` (one of ``text``, ``rect``,
            ``ellipse``, ``line``, ``arrow``, ``image``, ``link``,
            ``note``) and ``page`` (1-indexed integer).

    **Response:** ``202 Accepted`` with a ``task_id`` for polling, or
    an appropriate ``4xx`` error.

    Rate limit:
        10 requests per minute per client.
    """
    # --- Feature gate ---
    if not current_app.config.get("FEATURE_EDITOR", False):
        return jsonify({"error": "This feature is not enabled."}), 403

    # --- File presence check ---
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    edits_raw = request.form.get("edits", "[]")

    # --- Parse edits JSON ---
    try:
        edits = json.loads(edits_raw)
        if not isinstance(edits, list):
            return jsonify({"error": "Edits must be a JSON array."}), 400
    except (json.JSONDecodeError, TypeError):
        return jsonify({"error": "Invalid JSON in 'edits' field."}), 400

    # --- Basic edits bounds ---
    if len(edits) > 500:
        return jsonify({"error": "Maximum 500 edits allowed."}), 400

    # --- Validate each edit object ---
    for idx, edit in enumerate(edits):
        err = _validate_edit_object(edit, idx)
        if err:
            return jsonify({"error": err}), 400

    # --- Validate total embedded image size ---
    budget_err = _validate_data_url_budget(edits)
    if budget_err:
        return jsonify({"error": budget_err}), 400

    # --- Policy / quota check ---
    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="pdf-edit")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    # --- File validation ---
    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=["pdf"], actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    # --- Persist upload and dispatch task ---
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
