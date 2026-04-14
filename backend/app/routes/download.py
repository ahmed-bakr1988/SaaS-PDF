"""Local file download route — used when S3 is not configured."""
import os

from flask import Blueprint, send_file, abort, request, current_app

from app.services.policy_service import (
    PolicyError,
    assert_api_task_access,
    assert_web_task_access,
    resolve_api_actor,
    resolve_web_actor,
)

download_bp = Blueprint("download", __name__)


@download_bp.route("/<task_id>/<filename>", methods=["GET"])
def download_file(task_id: str, filename: str):
    """
    Serve a processed file from local filesystem.

    Only active in development (when S3 is not configured).
    """
    # Security: sanitize inputs
    # Only allow UUID-style task IDs and safe filenames
    if ".." in task_id or "/" in task_id or "\\" in task_id:
        abort(400, "Invalid task ID.")
    if ".." in filename or "/" in filename or "\\" in filename:
        abort(400, "Invalid filename.")

    try:
        if request.headers.get("X-API-Key", "").strip():
            actor = resolve_api_actor()
            assert_api_task_access(actor, task_id)
        else:
            actor = resolve_web_actor()
            # Download gate: anonymous users must register before downloading
            if actor.actor_type == "anonymous":
                return (
                    {"error": "signup_required",
                     "message": "Create a free account to download your file."},
                    401,
                )
            assert_web_task_access(actor, task_id)
    except PolicyError as exc:
        abort(exc.status_code, exc.message)

    output_dir = current_app.config["OUTPUT_FOLDER"]
    file_path = os.path.join(output_dir, task_id, filename)

    if not os.path.isfile(file_path):
        abort(404, "File not found or expired.")

    raw_name = request.args.get("name", filename)
    # Strip characters that could inject HTTP header values or path separators
    import re as _re
    download_name = _re.sub(r'[\r\n\x00/\\]', '', raw_name)[:255] or filename

    return send_file(
        file_path,
        as_attachment=True,
        download_name=download_name,
    )
