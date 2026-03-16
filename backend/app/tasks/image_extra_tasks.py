"""Celery tasks for image extra tools — Crop, Rotate/Flip."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.image_extra_service import (
    crop_image,
    rotate_flip_image,
    ImageExtraError,
)
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
        result=result, usage_source=usage_source, api_key_id=api_key_id,
        celery_task_id=celery_task_id,
    )
    _cleanup(task_id)
    return result


# ---------------------------------------------------------------------------
# Image Crop
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.image_extra_tasks.crop_image_task")
def crop_image_task(
    self, input_path, task_id, original_filename,
    left, top, right, bottom, quality=85,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    ext = os.path.splitext(original_filename)[1].lower().strip(".")
    if ext not in ("png", "jpg", "jpeg", "webp"):
        ext = "png"
    output_path = os.path.join(output_dir, f"{task_id}_cropped.{ext}")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Cropping image..."})
        stats = crop_image(input_path, output_path, left, top, right, bottom, quality)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}_cropped.{ext}"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {"status": "completed", "download_url": download_url,
                  "filename": download_name, **stats}
        return _finalize_task(task_id, user_id, "image-crop", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except ImageExtraError as e:
        return _finalize_task(task_id, user_id, "image-crop", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)


# ---------------------------------------------------------------------------
# Image Rotate/Flip
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.image_extra_tasks.rotate_flip_image_task")
def rotate_flip_image_task(
    self, input_path, task_id, original_filename,
    rotation=0, flip_horizontal=False, flip_vertical=False, quality=85,
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    ext = os.path.splitext(original_filename)[1].lower().strip(".")
    if ext not in ("png", "jpg", "jpeg", "webp"):
        ext = "png"
    output_path = os.path.join(output_dir, f"{task_id}_transformed.{ext}")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Transforming image..."})
        stats = rotate_flip_image(input_path, output_path, rotation,
                                  flip_horizontal, flip_vertical, quality)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        base = os.path.splitext(original_filename)[0]
        download_name = f"{base}_transformed.{ext}"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {"status": "completed", "download_url": download_url,
                  "filename": download_name, **stats}
        return _finalize_task(task_id, user_id, "image-rotate-flip", original_filename,
                              result, usage_source, api_key_id, self.request.id)
    except ImageExtraError as e:
        return _finalize_task(task_id, user_id, "image-rotate-flip", original_filename,
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)
