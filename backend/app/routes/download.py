"""Local file download route — used when S3 is not configured."""
import os

from flask import Blueprint, send_file, abort, request, current_app

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

    output_dir = current_app.config["OUTPUT_FOLDER"]
    file_path = os.path.join(output_dir, task_id, filename)

    if not os.path.isfile(file_path):
        abort(404, "File not found or expired.")

    download_name = request.args.get("name", filename)

    return send_file(
        file_path,
        as_attachment=True,
        download_name=download_name,
    )
