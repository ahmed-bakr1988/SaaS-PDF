"""Celery tasks for OCR processing."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.ocr_service import ocr_image, ocr_pdf, OCRError
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


@celery.task(bind=True, name="app.tasks.ocr_tasks.ocr_image_task")
def ocr_image_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    lang: str = "eng",
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: Extract text from an image via OCR."""
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.txt")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Running OCR on image..."})

        stats = ocr_image(input_path, lang=lang)

        # Write text to file for download
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(stats["text"])

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_ocr.txt"

        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "text": stats["text"][:5000],  # preview (first 5k chars)
            "char_count": stats["char_count"],
            "lang": stats["lang"],
        }

        logger.info("Task %s: OCR image completed (%d chars)", task_id, stats["char_count"])
        return _finalize_task(
            task_id, user_id, "ocr-image", original_filename,
            result, usage_source, api_key_id, self.request.id,
        )

    except OCRError as e:
        logger.error("Task %s: OCR error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "ocr-image", original_filename,
            {"status": "failed", "error": str(e)},
            usage_source, api_key_id, self.request.id,
        )
    except Exception as e:
        logger.error("Task %s: Unexpected error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "ocr-image", original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source, api_key_id, self.request.id,
        )


@celery.task(bind=True, name="app.tasks.ocr_tasks.ocr_pdf_task")
def ocr_pdf_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    lang: str = "eng",
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: Extract text from a scanned PDF via OCR."""
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.txt")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Converting PDF pages & running OCR..."})

        stats = ocr_pdf(input_path, output_path, lang=lang)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_ocr.txt"

        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "text": stats["text"][:5000],
            "page_count": stats["page_count"],
            "char_count": stats["char_count"],
            "lang": lang,
        }

        logger.info("Task %s: OCR PDF completed (%d pages, %d chars)", task_id, stats["page_count"], stats["char_count"])
        return _finalize_task(
            task_id, user_id, "ocr-pdf", original_filename,
            result, usage_source, api_key_id, self.request.id,
        )

    except OCRError as e:
        logger.error("Task %s: OCR error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "ocr-pdf", original_filename,
            {"status": "failed", "error": str(e)},
            usage_source, api_key_id, self.request.id,
        )
    except Exception as e:
        logger.error("Task %s: Unexpected error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "ocr-pdf", original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source, api_key_id, self.request.id,
        )
