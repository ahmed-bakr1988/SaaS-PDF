"""PDF Editor route — apply visual annotations (text, shapes, images) to PDFs.

This blueprint exposes:
  POST /edit   – dispatch edits to Celery and return a task ID.
  POST /email  – send a completed edited PDF to the user's email address.
"""
import json
import re

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

pdf_editor_bp = Blueprint("pdf_editor", __name__)

# All edit operation types accepted by the backend service.
_VALID_EDIT_TYPES = {"text", "rect", "ellipse", "line", "arrow", "image", "link", "note", "path"}

# Maximum total size (bytes) of all embedded data-URLs across all edits.
_MAX_TOTAL_DATA_URL_BYTES = 50 * 1024 * 1024  # 50 MB

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_edit_object(edit: dict, index: int) -> str | None:
    """Validate a single edit operation dictionary."""
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
    """Ensure the combined size of all embedded data-URLs doesn't exceed the safety limit."""
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
    """Apply visual annotations to a PDF and return a Celery task ID."""
    # --- Feature gate ---
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

    if len(edits) > 500:
        return jsonify({"error": "Maximum 500 edits allowed."}), 400

    for idx, edit in enumerate(edits):
        err = _validate_edit_object(edit, idx)
        if err:
            return jsonify({"error": err}), 400

    budget_err = _validate_data_url_budget(edits)
    if budget_err:
        return jsonify({"error": budget_err}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="pdf-edit")
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

    task = enqueue_task(
        "app.tasks.pdf_editor_tasks.edit_pdf_task",
        input_path, task_id, original_filename, edits,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "pdf-edit", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "PDF editing started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202


@pdf_editor_bp.route("/email", methods=["POST"])
@limiter.limit("5/minute")
def email_pdf_route():
    """Send a completed edited PDF to the recipient's email address.

    **Request:** ``multipart/form-data``

    Form fields:
        file (FileStorage): The edited PDF file to send as attachment.
        email (str): Recipient email address.
        filename (str, optional): Suggested attachment filename.

    **Response:** ``200 OK`` on success or an appropriate error.
    """
    if not current_app.config.get("FEATURE_EDITOR", False):
        return jsonify({"error": "This feature is not enabled."}), 403

    email_addr = (request.form.get("email") or "").strip().lower()
    if not email_addr or not _EMAIL_RE.match(email_addr):
        return jsonify({"error": "Please provide a valid email address."}), 400

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    pdf_file = request.files["file"]
    attachment_name = (request.form.get("filename") or "edited_document.pdf").strip()
    if not attachment_name.lower().endswith(".pdf"):
        attachment_name += ".pdf"

    try:
        pdf_bytes = pdf_file.read()
        if not pdf_bytes:
            return jsonify({"error": "The uploaded file is empty."}), 400
        if len(pdf_bytes) > 25 * 1024 * 1024:
            return jsonify({"error": "File too large to email (max 25 MB)."}), 400
    except Exception:
        return jsonify({"error": "Could not read the uploaded file."}), 500

    try:
        from app.services.email_service import send_email_with_attachment
        html_body = f"""
        <div style="font-family: sans-serif; max-width: 540px; margin: auto; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                      border-radius: 12px 12px 0 0; padding: 28px 32px;">
            <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 700;">
              Your edited PDF is ready &#x2705;
            </h1>
          </div>
          <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;
                      padding: 28px 32px; background: #ffffff;">
            <p style="margin: 0 0 16px; color: #475569; line-height: 1.6;">
              Your edited PDF <strong>{attachment_name}</strong> is attached to this email.
            </p>
            <p style="margin: 0 0 24px; color: #475569; line-height: 1.6;">
              Visit <a href="https://dociva.io/tools/pdf-editor"
                       style="color: #4f46e5; text-decoration: none;">Dociva PDF Editor</a>
              anytime to make further edits.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              Sent by <a href="https://dociva.io" style="color: #94a3b8;">Dociva.io</a>
            </p>
          </div>
        </div>
        """
        sent = send_email_with_attachment(
            to=email_addr,
            subject=f"Your edited PDF: {attachment_name}",
            html_body=html_body,
            attachment_bytes=pdf_bytes,
            attachment_name=attachment_name,
            attachment_mime="application/pdf",
        )
    except Exception as exc:
        current_app.logger.exception("Email send failed: %s", exc)
        return jsonify({"error": "Failed to send the email. Please try again later."}), 500

    if not sent:
        return jsonify({"error": "Email could not be delivered. Check your SMTP configuration."}), 503

    return jsonify({"message": f"PDF sent successfully to {email_addr}."}), 200
