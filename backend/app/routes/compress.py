"""PDF compression routes."""
from flask import Blueprint, request, jsonify

from app.extensions import limiter
from app.utils.file_validator import validate_file, FileValidationError
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

    # Validate quality parameter
    if quality not in ("low", "medium", "high"):
        quality = "medium"

    try:
        original_filename, ext = validate_file(file, allowed_types=["pdf"])
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    # Save file to temp location
    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    # Dispatch async task
    task = compress_pdf_task.delay(input_path, task_id, original_filename, quality)

    return jsonify({
        "task_id": task.id,
        "message": "Compression started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
