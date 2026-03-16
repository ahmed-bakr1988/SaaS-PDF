"""Celery tasks for barcode generation."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.barcode_service import generate_barcode, BarcodeGenerationError
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


@celery.task(bind=True, name="app.tasks.barcode_tasks.generate_barcode_task")
def generate_barcode_task(
    self, data, barcode_type, task_id, output_format="png",
    user_id=None, usage_source="web", api_key_id=None,
):
    output_dir = _get_output_dir(task_id)
    ext = "svg" if output_format == "svg" else "png"
    output_path = os.path.join(output_dir, f"{task_id}_barcode.{ext}")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Generating barcode..."})
        stats = generate_barcode(data, barcode_type, output_path, output_format)
        final_path = stats.pop("output_path")

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(final_path, task_id, folder="outputs")
        download_name = f"barcode_{barcode_type}.{ext}"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {"status": "completed", "download_url": download_url,
                  "filename": download_name, **stats}
        return _finalize_task(task_id, user_id, "barcode", data[:50],
                              result, usage_source, api_key_id, self.request.id)
    except BarcodeGenerationError as e:
        return _finalize_task(task_id, user_id, "barcode", data[:50],
                              {"status": "failed", "error": str(e)},
                              usage_source, api_key_id, self.request.id)
