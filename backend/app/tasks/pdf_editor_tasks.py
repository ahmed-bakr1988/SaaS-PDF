"""Celery tasks for PDF editing."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.pdf_editor_service import apply_pdf_edits, PDFEditorError
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


@celery.task(bind=True, name="app.tasks.pdf_editor_tasks.edit_pdf_task")
def edit_pdf_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    edits: list[dict],
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: Apply text annotations to a PDF."""
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.pdf")

    try:
        self.update_state(state="PROCESSING", meta={"step": "Applying edits to PDF..."})

        stats = apply_pdf_edits(input_path, output_path, edits)

        self.update_state(state="PROCESSING", meta={"step": "Uploading result..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_edited.pdf"

        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "page_count": stats["page_count"],
            "edits_applied": stats["edits_applied"],
            "output_size": stats["output_size"],
        }

        logger.info("Task %s: PDF edit completed (%d edits)", task_id, stats["edits_applied"])
        return _finalize_task(
            task_id, user_id, "pdf-edit", original_filename,
            result, usage_source, api_key_id, self.request.id,
        )

    except PDFEditorError as e:
        logger.error("Task %s: PDF edit error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "pdf-edit", original_filename,
            {"status": "failed", "error": str(e)},
            usage_source, api_key_id, self.request.id,
        )
    except Exception as e:
        logger.error("Task %s: Unexpected error — %s", task_id, e)
        return _finalize_task(
            task_id, user_id, "pdf-edit", original_filename,
            {"status": "failed", "error": "An unexpected error occurred."},
            usage_source, api_key_id, self.request.id,
        )
