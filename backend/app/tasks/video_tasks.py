"""Celery tasks for video processing."""
import os
import logging

from app.extensions import celery
from app.services.video_service import video_to_gif, VideoProcessingError
from app.services.storage_service import storage
from app.utils.sanitizer import cleanup_task_files


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)

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
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
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

        _cleanup(task_id)

        logger.info(f"Task {task_id}: Video→GIF creation completed")
        return result

    except VideoProcessingError as e:
        logger.error(f"Task {task_id}: Video error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}
