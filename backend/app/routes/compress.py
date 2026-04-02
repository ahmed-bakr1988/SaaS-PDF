"""PDF compression routes."""
import os

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
from app.services.quote_service import create_quote, QuoteError
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.tasks.compress_tasks import compress_pdf_task

compress_bp = Blueprint("compress", __name__)


@compress_bp.route("/pdf", methods=["POST"])
@limiter.limit("10/minute")
def compress_pdf_route():
    """
    Compress a PDF file.

    Accepts: multipart/form-data with 'file' field (PDF)
             Optional form field 'quality': "low", "medium", "high" (default: "medium")
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    quality = request.form.get("quality", "medium")

    if quality not in ("low", "medium", "high"):
        quality = "medium"

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor, tool="compress-pdf")
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(file, allowed_types=["pdf"], actor=actor)
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    file_size_kb = os.path.getsize(input_path) / 1024
    try:
        quote = create_quote(actor.user_id, actor.plan, "compress-pdf", file_size_kb=file_size_kb)
    except QuoteError as e:
        return jsonify({"error": e.message}), e.status_code

    task = compress_pdf_task.delay(
        input_path,
        task_id,
        original_filename,
        quality,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "compress-pdf", task.id, quote=quote)

    return jsonify({
        "task_id": task.id,
        "message": "Compression started. Poll /api/tasks/{task_id}/status for progress.",
        "quote": quote.to_dict(),
    }), 202
