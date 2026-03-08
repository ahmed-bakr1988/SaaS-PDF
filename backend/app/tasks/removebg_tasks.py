"""Celery tasks for background removal."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.removebg_service import remove_background, RemoveBGError
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


def _get_output_dir(task_id: str) -> str:
    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def _finalize_task(
    task_id, user_id, tool, original_filename, result,
    usage_source, api_key_id, celery_task_id,
):
    finalize_task_tracking(
        user_id=user_id, tool=tool, original_filename=original_filename,
        result=result, usage_source=usage_source,
        api_key_id=api_key_id, celery_task_id=celery_task_id,
    )
    _cleanup(task_id)
    return result


@celery.task(bind=True, name="app.tasks.removebg_tasks.remove_bg_task")
def remove_bg_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: Remove background from an image."""
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.png")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Removing background..."})

        stats = remove_background(input_path, output_path)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_nobg.png"

        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "original_size": stats["original_size"],
            "output_size": stats["output_size"],
            "width": stats["width"],
            "height": stats["height"],
        }

        logger.info("Task %s: Background removal completed", task_id)
        return _finalize_task(
            task_id, user_id, "remove-bg", original_filename,
            result, usage_source, api_key_id, self.request.id,
        )

    except RemoveBGError as e:
        logger.error("Task %s: RemoveBG error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "remove-bg", original_filename,
            {"status": "failed", "error": str(e)},
            usage_source, api_key_id, self.request.id,
        )
    except Exception as e:
        logger.error("Task %s: Unexpected error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "remove-bg", original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source, api_key_id, self.request.id,
        )
