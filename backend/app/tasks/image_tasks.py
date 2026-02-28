"""Celery tasks for image processing."""
import os
import logging

from app.extensions import celery
from app.services.image_service import convert_image, resize_image, ImageProcessingError
from app.services.storage_service import storage
from app.utils.sanitizer import cleanup_task_files


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.image_tasks.convert_image_task")
def convert_image_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    output_format: str,
    quality: int = 85,
):
    """
    Async task: Convert an image to a different format.

    Args:
        input_path: Path to the uploaded image
        task_id: Unique task identifier
        original_filename: Original filename for download
        output_format: Target format ("jpg", "png", "webp")
        quality: Output quality 1-100

    Returns:
        dict with download_url and conversion stats
    """
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}.{output_format}")

    try:
        self.update_state(
            state="PROCESSING",
            meta={"step": f"Converting image to {output_format.upper()}..."},
        )

        stats = convert_image(input_path, output_path, output_format, quality)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})

        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}.{output_format}"

        download_url = storage.generate_presigned_url(
            s3_key, original_filename=download_name
        )

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "original_size": stats["original_size"],
            "converted_size": stats["converted_size"],
            "width": stats["width"],
            "height": stats["height"],
            "format": stats["format"],
        }

        _cleanup(task_id)

        logger.info(f"Task {task_id}: Image conversion to {output_format} completed")
        return result

    except ImageProcessingError as e:
        logger.error(f"Task {task_id}: Image error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}


@celery.task(bind=True, name="app.tasks.image_tasks.resize_image_task")
def resize_image_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    width: int | None = None,
    height: int | None = None,
    quality: int = 85,
):
    """
    Async task: Resize an image.

    Args:
        input_path: Path to the uploaded image
        task_id: Unique task identifier
        original_filename: Original filename for download
        width: Target width
        height: Target height
        quality: Output quality 1-100

    Returns:
        dict with download_url and resize info
    """
    ext = os.path.splitext(original_filename)[1].lstrip(".")
    output_dir = os.path.join("/tmp/outputs", task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}.{ext}")

    try:
        self.update_state(
            state="PROCESSING",
            meta={"step": "Resizing image..."},
        )

        stats = resize_image(input_path, output_path, width, height, quality)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})

        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_resized.{ext}"

        download_url = storage.generate_presigned_url(
            s3_key, original_filename=download_name
        )

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "original_width": stats["original_width"],
            "original_height": stats["original_height"],
            "new_width": stats["new_width"],
            "new_height": stats["new_height"],
        }

        _cleanup(task_id)

        logger.info(f"Task {task_id}: Image resize completed")
        return result

    except ImageProcessingError as e:
        logger.error(f"Task {task_id}: Image error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        _cleanup(task_id)
        return {"status": "failed", "error": "An unexpected error occurred."}
