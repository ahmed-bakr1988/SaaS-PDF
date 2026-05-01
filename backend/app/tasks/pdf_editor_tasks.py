"""Celery tasks for PDF editing.

This module wraps :func:`app.services.pdf_editor_service.apply_pdf_edits`
in a Celery task so the Flask route can return immediately with a task ID.
The task handles:
  1. Applying all edit operations via the service layer.
  2. Uploading the result to storage (S3 or local).
  3. Generating a presigned download URL.
  4. Finalising tracking / usage records.
  5. Cleaning up temporary files.
"""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.pdf_editor_service import apply_pdf_edits, PDFEditorError
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str) -> None:
    """Remove temporary upload/output files for *task_id*.

    When S3 storage is in use the output files are already uploaded, so
    local copies can be removed.  Otherwise keep them for direct serving.

    Args:
        task_id: The unique identifier of the processing task.
    """
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


def _get_output_dir(task_id: str) -> str:
    """Return (and create) the output directory for *task_id*.

    Args:
        task_id: The unique identifier of the processing task.

    Returns:
        Absolute path to the output directory.
    """
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
    celery_task_id: str,
) -> dict:
    """Persist usage tracking and clean up temporary files.

    This is called at the end of every task run — both on success and
    on failure — to ensure records are created and disk space is freed.

    Args:
        task_id: Internal file-system task identifier.
        user_id: Authenticated user ID (or ``None`` for guests).
        tool: Tool slug used for quota tracking (``"pdf-edit"``).
        original_filename: The uploaded file's original name.
        result: The result dict to record (contains status + download info).
        usage_source: ``"web"`` or ``"api"``.
        api_key_id: API key ID if the request came via API.
        celery_task_id: The Celery-assigned task ID.

    Returns:
        The *result* dict, unchanged.
    """
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
    """Celery task: apply visual edits to a PDF and upload the result.

    Workflow:
        1. Update state → ``PROCESSING`` (applying edits).
        2. Call :func:`apply_pdf_edits` to render all operations.
        3. Update state → ``PROCESSING`` (uploading result).
        4. Upload to storage and generate a download URL.
        5. Finalise tracking and return the result dict.

    Args:
        self: Celery task instance (``bind=True``).
        input_path: Path to the uploaded source PDF.
        task_id: Internal identifier for file organisation.
        original_filename: The user's original filename (used in download name).
        edits: List of edit operation dicts from the frontend.
        user_id: Authenticated user's ID, or ``None`` for guests.
        usage_source: ``"web"`` or ``"api"``.
        api_key_id: API key ID if the request was via API.

    Returns:
        A result dict with ``status``, ``download_url``, ``filename``,
        ``page_count``, ``edits_applied``, and ``output_size``.
    """
    output_dir = _get_output_dir(task_id)
    output_path = os.path.join(output_dir, f"{task_id}.pdf")

    try:
        # --- Step 1: Apply edits ---
        self.update_state(
            state="PROCESSING",
            meta={"step": "Applying edits to PDF...", "progress": 30},
        )

        stats = apply_pdf_edits(input_path, output_path, edits)

        # --- Step 2: Upload to storage ---
        self.update_state(
            state="PROCESSING",
            meta={"step": "Uploading result...", "progress": 80},
        )
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")

        # Build a user-friendly download filename.
        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_edited.pdf"

        download_url = storage.generate_presigned_url(
            s3_key, original_filename=download_name,
        )

        result = {
            "status": "completed",
            "download_url": download_url,
            "filename": download_name,
            "page_count": stats["page_count"],
            "edits_applied": stats["edits_applied"],
            "output_size": stats["output_size"],
        }

        logger.info(
            "Task %s: PDF edit completed (%d edits on %d pages)",
            task_id, stats["edits_applied"], stats["page_count"],
        )
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
