"""Routes for converting files to Markdown."""

import os

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.markdown_convert_service import (
    IMAGE_EXTENSIONS,
    OFFICE_TO_PDF_EXTENSIONS,
    SUPPORTED_MARKDOWN_TYPES,
    VIDEO_EXTENSIONS,
)
from app.services.policy_service import (
    PolicyError,
    assert_quota_available,
    build_task_tracking_kwargs,
    record_accepted_usage,
    resolve_web_actor,
    validate_actor_file,
)
from app.services.quote_service import QuoteError, create_quote
from app.utils.file_validator import FileValidationError
from app.utils.sanitizer import generate_safe_path
from app.utils.task_queue import enqueue_task

markdown_convert_bp = Blueprint("markdown_convert", __name__)


@markdown_convert_bp.route("/to-markdown", methods=["POST"])
@limiter.limit("8/minute")
def file_to_markdown_route():
    """Upload a supported file and convert it to Markdown asynchronously."""

    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    actor = resolve_web_actor()

    try:
        assert_quota_available(actor, tool="file-to-markdown")
    except PolicyError as exc:
        return jsonify({"error": exc.message}), exc.status_code

    try:
        original_filename, ext = validate_actor_file(
            file,
            allowed_types=SUPPORTED_MARKDOWN_TYPES,
            actor=actor,
        )
    except FileValidationError as exc:
        return jsonify({"error": exc.message}), exc.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    file_size_kb = os.path.getsize(input_path) / 1024
    try:
        quote = create_quote(
            actor.user_id,
            actor.plan,
            "file-to-markdown",
            file_size_kb=file_size_kb,
        )
    except QuoteError as exc:
        return jsonify({"error": exc.message}), exc.status_code

    _TEXT_EXTS = {"txt", "md", "markdown", "log", "html", "htm"}
    _DATA_EXTS = {"csv", "json", "xml", "sql"}
    _CONFIG_EXTS = {"env", "yaml", "yml", "toml", "ini", "cfg"}
    _LIGHTWEIGHT_EXTS = _TEXT_EXTS | _DATA_EXTS | _CONFIG_EXTS
    _ZIP_EXTS = {"zip"}

    task_name = "app.tasks.markdown_convert_tasks.convert_file_to_markdown_task"
    if ext in IMAGE_EXTENSIONS:
        task_name = "app.tasks.markdown_convert_tasks.convert_image_to_markdown_task"
    elif ext in VIDEO_EXTENSIONS:
        task_name = "app.tasks.markdown_convert_tasks.convert_video_to_markdown_task"
    elif ext in _LIGHTWEIGHT_EXTS:
        task_name = "app.tasks.markdown_convert_tasks.convert_text_to_markdown_task"
    elif ext in _ZIP_EXTS:
        task_name = "app.tasks.markdown_convert_tasks.convert_code_to_markdown_task"

    task = enqueue_task(
        task_name,
        input_path,
        task_id,
        original_filename,
        ext,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "file-to-markdown", task.id, quote=quote)

    return jsonify({
        "task_id": task.id,
        "message": "Markdown conversion started. Poll /api/tasks/{task_id}/status for progress.",
        "quote": quote.to_dict(),
    }), 202
