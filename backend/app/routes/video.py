"""Video processing routes."""
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
from app.tasks.video_tasks import create_gif_task

video_bp = Blueprint("video", __name__)

ALLOWED_VIDEO_TYPES = ["mp4", "webm"]


@video_bp.route("/to-gif", methods=["POST"])
@limiter.limit("5/minute")
def video_to_gif_route():
    """
    Convert a video clip to an animated GIF.

    Accepts: multipart/form-data with:
        - 'file': Video file (MP4, WebM, max 50MB)
        - 'start_time' (optional): Start time in seconds (default: 0)
        - 'duration' (optional): Duration in seconds, max 15 (default: 5)
        - 'fps' (optional): Frames per second, max 20 (default: 10)
        - 'width' (optional): Output width, max 640 (default: 480)
    Returns: JSON with task_id for polling
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    # Parse and validate parameters
    try:
        start_time = float(request.form.get("start_time", 0))
        duration = float(request.form.get("duration", 5))
        fps = int(request.form.get("fps", 10))
        width = int(request.form.get("width", 480))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid parameters. Must be numeric."}), 400

    # Enforce limits
    if start_time < 0:
        return jsonify({"error": "Start time cannot be negative."}), 400
    if duration <= 0 or duration > 15:
        return jsonify({"error": "Duration must be between 0.5 and 15 seconds."}), 400
    if fps < 1 or fps > 20:
        return jsonify({"error": "FPS must be between 1 and 20."}), 400
    if width < 100 or width > 640:
        return jsonify({"error": "Width must be between 100 and 640 pixels."}), 400

    actor = resolve_web_actor()
    try:
        assert_quota_available(actor)
    except PolicyError as e:
        return jsonify({"error": e.message}), e.status_code

    try:
        original_filename, ext = validate_actor_file(
            file, allowed_types=ALLOWED_VIDEO_TYPES, actor=actor
        )
    except FileValidationError as e:
        return jsonify({"error": e.message}), e.code

    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    file.save(input_path)

    task = create_gif_task.delay(
        input_path, task_id, original_filename,
        start_time, duration, fps, width,
        **build_task_tracking_kwargs(actor),
    )
    record_accepted_usage(actor, "video-to-gif", task.id)

    return jsonify({
        "task_id": task.id,
        "message": "GIF creation started. Poll /api/tasks/{task_id}/status for progress.",
    }), 202
