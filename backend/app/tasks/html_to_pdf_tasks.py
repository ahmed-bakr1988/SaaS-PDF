"""Celery tasks for HTML to PDF conversion."""
import logging
import os

from flask import current_app

from app.extensions import celery
from app.services.html_to_pdf_service import HtmlToPdfError, html_to_pdf
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


@celery.task(bind=True, name="app.tasks.html_to_pdf_tasks.html_to_pdf_task")
def html_to_pdf_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    render_options: dict | None = None,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Convert an HTML file to PDF."""
    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{task_id}.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Preparing HTML source..."})

        stats = html_to_pdf(input_path, output_path, render_options=render_options)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}.pdf"
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "output_size": stats["output_size"],
            "renderer": stats.get("renderer"),
        }

        logger.info(f"Task {task_id}: HTML to PDF completed")
        finalize_task_tracking(
            user_id=user_id, tool="html-to-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except HtmlToPdfError as e:
        logger.error(f"Task {task_id}: {e}")
        result = {"status": "failed", "error": str(e)}
        finalize_task_tracking(
            user_id=user_id, tool="html-to-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        result = {"status": "failed", "error": "An unexpected error occurred."}
        finalize_task_tracking(
            user_id=user_id, tool="html-to-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result
