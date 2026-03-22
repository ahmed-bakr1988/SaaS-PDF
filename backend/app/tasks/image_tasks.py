"""Celery tasks for image processing."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.image_service import convert_image, resize_image, convert_image_to_svg, ImageProcessingError
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
    tool: str,
    original_filename: str,
    result: dict,
    usage_source: str,
    api_key_id: int | None,
    celery_task_id: str | None,
):
    """Persist optional history and cleanup task files."""
    finalize_task_tracking(
        user_id=user_id,
        tool=tool,
        original_filename=original_filename,
        result=result,
        usage_source=usage_source,
        api_key_id=api_key_id,
        celery_task_id=celery_task_id,
    )
    _cleanup(task_id)
    return result

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="app.tasks.image_tasks.convert_image_task")
def convert_image_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    output_format: str,
    quality: int = 85,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
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
    output_dir = _get_output_dir(task_id)
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

        logger.info(f"Task {task_id}: Image conversion to {output_format} completed")
        return _finalize_task(
            task_id,
            user_id,
            "image-convert",
            original_filename,
            result,
            usage_source,
            api_key_id,
            self.request.id,
        )

    except ImageProcessingError as e:
        logger.error(f"Task {task_id}: Image error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            "image-convert",
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
            "image-convert",
            original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source,
            api_key_id,
            self.request.id,
        )


@celery.task(bind=True, name="app.tasks.image_tasks.resize_image_task")
def resize_image_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    width: int | None = None,
    height: int | None = None,
    quality: int = 85,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
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
    output_dir = _get_output_dir(task_id)
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

        logger.info(f"Task {task_id}: Image resize completed")
        return _finalize_task(
            task_id,
            user_id,
            "image-resize",
            original_filename,
            result,
            usage_source,
            api_key_id,
            self.request.id,
        )

    except ImageProcessingError as e:
        logger.error(f"Task {task_id}: Image error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            "image-resize",
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
            "image-resize",
            original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source,
            api_key_id,
            self.request.id,
        )


@celery.task(bind=True, name="app.tasks.image_tasks.convert_image_to_svg_task")
def convert_image_to_svg_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    color_mode: str = "color",
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """
    Async task: Convert a raster image to SVG.

    Args:
        input_path: Path to the uploaded image
        task_id: Unique task identifier
        original_filename: Original filename for download
        color_mode: "color" or "binary"

    Returns:
        dict with download_url and conversion stats
    """
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.svg")

    try:
        self.update_state(
            state="PROCESSING",
            meta={"step": "Converting image to SVG..."},
        )

        stats = convert_image_to_svg(input_path, output_path, color_mode)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})

        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}.svg"

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
            "format": "svg",
        }

        logger.info(f"Task {task_id}: Image to SVG conversion completed")
        return _finalize_task(
            task_id,
            user_id,
            "image-to-svg",
            original_filename,
            result,
            usage_source,
            api_key_id,
            self.request.id,
        )

    except ImageProcessingError as e:
        logger.error(f"Task {task_id}: Image error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            "image-to-svg",
            original_filename,
            {"status": "failed", "error": str(e)},
            usage_source,
            api_key_id,
            self.request.id,
        )

    except Exception as e:
        logger.exception(f"Task {task_id}: Unexpected error — {e}")
        return _finalize_task(
            task_id,
            user_id,
            "image-to-svg",
            original_filename,
            {"status": "failed", "error": str(e) or "An unexpected error occurred."},
            usage_source,
            api_key_id,
            self.request.id,
        )
