"""Celery tasks for video processing."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.video_service import video_to_gif, VideoProcessingError
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


def _get_output_dir(task_id: str) -> str:
    """Resolve output directory from app config."""
    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def _finalize_task(
    task_id: str,
    user_id: int | None,
    original_filename: str,
    result: dict,
    usage_source: str,
    api_key_id: int | None,
    celery_task_id: str | None,
):
    """Persist optional history and cleanup task files."""
    finalize_task_tracking(
        user_id=user_id,
        tool="video-to-gif",
        original_filename=original_filename,
        result=result,
        usage_source=usage_source,
        api_key_id=api_key_id,
        celery_task_id=celery_task_id,
    )
    _cleanup(task_id)
    return result

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.video_tasks.create_gif_task")
def create_gif_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    start_time: float = 0,
    duration: float = 5,
    fps: int = 10,
    width: int = 480,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """
    Async task: Convert video clip to animated GIF.

    Args:
        input_path: Path to the uploaded video
        task_id: Unique task identifier
        original_filename: Original filename for download
        start_time: Start time in seconds
        duration: Duration in seconds
        fps: Frames per second
        width: Output width in pixels

    Returns:
        dict with download_url and GIF info
    """
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.gif")

    try:
        self.update_state(
            state="PROCESSING",
            meta={"step": "Creating GIF from video..."},
        )

        stats = video_to_gif(
            input_path, output_path,
            start_time=start_time,
            duration=duration,
            fps=fps,
            width=width,
        )

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})

        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}.gif"

        download_url = storage.generate_presigned_url(
            s3_key, original_filename=download_name
        )

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "output_size": stats["output_size"],
            "duration": stats["duration"],
            "fps": stats["fps"],
            "width": stats["width"],
            "height": stats["height"],
        }

        logger.info(f"Task {task_id}: Video→GIF creation completed")
        return _finalize_task(
            task_id,
            user_id,
            original_filename,
            result,
            usage_source,
            api_key_id,
            self.request.id,
        )

    except VideoProcessingError as e:
        logger.error(f"Task {task_id}: Video error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            original_filename,
            {"status": "failed", "error": str(e)},
            usage_source,
            api_key_id,
            self.request.id,
        )

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source,
            api_key_id,
            self.request.id,
        )
