"""Celery tasks for QR code generation."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.qrcode_service import generate_qr_code, QRCodeError
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


@celery.task(bind=True, name="app.tasks.qrcode_tasks.generate_qr_task")
def generate_qr_task(
    self,
    task_id: str,
    data: str,
    size: int = 300,
    output_format: str = "png",
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Generate a QR code image."""
    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}.{output_format}")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Generating QR code..."})

        stats = generate_qr_code(data, output_path, size, output_format)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        download_name = f"qrcode.{output_format}"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "output_size": stats["output_size"],
            "width": stats["width"],
            "height": stats["height"],
        }

        logger.info(f"Task {task_id}: QR code generated")
        finalize_task_tracking(
            user_id=user_id, tool="qr-code",
            original_filename="qrcode", result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except QRCodeError as e:
        logger.error(f"Task {task_id}: {e}")
        result = {"status": "failed", "error": str(e)}
        finalize_task_tracking(
            user_id=user_id, tool="qr-code",
            original_filename="qrcode", result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        result = {"status": "failed", "error": "An unexpected error occurred."}
        finalize_task_tracking(
            user_id=user_id, tool="qr-code",
            original_filename="qrcode", result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result
