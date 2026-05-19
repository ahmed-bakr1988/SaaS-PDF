"""Celery tasks for file-to-Markdown conversion."""

from __future__ import annotations

import logging
import os

from flask import current_app

from app.extensions import celery
from app.services.markdown_convert_service import (
    MarkdownConversionError,
    convert_file_to_markdown,
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
    task_id: str,
    user_id: int | None,
    original_filename: str,
    result: dict,
    usage_source: str,
    api_key_id: int | None,
    celery_task_id: str | None,
):
    finalize_task_tracking(
        user_id=user_id,
        tool="file-to-markdown",
        original_filename=original_filename,
        result=result,
        usage_source=usage_source,
        api_key_id=api_key_id,
        celery_task_id=celery_task_id,
    )
    _cleanup(task_id)
    return result


def _run_markdown_conversion(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    ext: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Convert one uploaded file into Markdown and finalize task tracking."""

    output_dir = _get_output_dir(task_id)
    name_without_ext = os.path.splitext(original_filename)[0] or "converted-file"
    output_path = os.path.join(output_dir, f"{task_id}.md")
    download_name = f"{name_without_ext}.md"

    try:
        self.update_state(state="PROCESSING", meta={"step": "Extracting AI context..."})
        conversion = convert_file_to_markdown(
            input_path,
            output_path,
            original_filename=original_filename,
            ext=ext,
            work_dir=output_dir,
        )

        self.update_state(state="PROCESSING", meta={"step": "Storing AI context..."})
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        download_url = storage.generate_presigned_url(
            s3_key,
            original_filename=download_name,
        )

        output_size = os.path.getsize(output_path)

        # Use AIContextResult.to_task_result() when available (pipeline path),
        # otherwise fall back to the legacy dict shape (backward compat).
        if hasattr(conversion, "metrics") and conversion.metrics is not None:
            from app.ai_pipeline.models.ai_context_result import AIContextResult
            ai_result = AIContextResult(
                markdown=conversion.markdown,
                method=conversion.method,
                char_count=conversion.char_count,
                chunks=conversion.chunks or [],
                prompt=conversion.prompt or "",
                metrics=conversion.metrics,
            )
            result = ai_result.to_task_result(download_url, download_name, output_size)
        else:
            result = {
                "status": "completed",
                "download_url": download_url,
                "filename": download_name,
                "output_size": output_size,
                "text": conversion.markdown[:5000],
                "char_count": conversion.char_count,
                "format": "md",
                "conversion_method": conversion.method,
            }

        logger.info(
            "Task %s: file-to-markdown completed via %s (%d chars)",
            task_id,
            conversion.method,
            conversion.char_count,
        )
        return _finalize_task(
            task_id,
            user_id,
            original_filename,
            result,
            usage_source,
            api_key_id,
            self.request.id,
        )

    except MarkdownConversionError as exc:
        logger.warning("Task %s: Markdown conversion failed: %s", task_id, exc)
        return _finalize_task(
            task_id,
            user_id,
            original_filename,
            {
                "status": "failed",
                "error": str(exc),
                "error_code": "MARKDOWN_CONVERSION_UNSUPPORTED",
                "user_message": str(exc),
            },
            usage_source,
            api_key_id,
            self.request.id,
        )
    except Exception:
        logger.exception("Task %s: Unexpected Markdown conversion error", task_id)
        return _finalize_task(
            task_id,
            user_id,
            original_filename,
            {
                "status": "failed",
                "error": "An unexpected error occurred.",
                "error_code": "MARKDOWN_CONVERSION_FAILED",
                "user_message": "The file could not be converted to Markdown.",
            },
            usage_source,
            api_key_id,
            self.request.id,
        )


@celery.task(
    bind=True,
    name="app.tasks.markdown_convert_tasks.convert_file_to_markdown_task",
    soft_time_limit=900,
    time_limit=960,
)
def convert_file_to_markdown_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    ext: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: convert a document/text/archive file into Markdown."""
    return _run_markdown_conversion(
        self,
        input_path,
        task_id,
        original_filename,
        ext,
        user_id=user_id,
        usage_source=usage_source,
        api_key_id=api_key_id,
    )


@celery.task(
    bind=True,
    name="app.tasks.markdown_convert_tasks.convert_image_to_markdown_task",
    soft_time_limit=900,
    time_limit=960,
)
def convert_image_to_markdown_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    ext: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: convert an image file into Markdown."""
    return _run_markdown_conversion(
        self,
        input_path,
        task_id,
        original_filename,
        ext,
        user_id=user_id,
        usage_source=usage_source,
        api_key_id=api_key_id,
    )


@celery.task(
    bind=True,
    name="app.tasks.markdown_convert_tasks.convert_video_to_markdown_task",
    soft_time_limit=300,
    time_limit=360,
)
def convert_video_to_markdown_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    ext: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: convert video metadata into Markdown."""
    return _run_markdown_conversion(
        self,
        input_path,
        task_id,
        original_filename,
        ext,
        user_id=user_id,
        usage_source=usage_source,
        api_key_id=api_key_id,
    )


@celery.task(
    bind=True,
    name="app.tasks.markdown_convert_tasks.convert_text_to_markdown_task",
    soft_time_limit=120,
    time_limit=180,
)
def convert_text_to_markdown_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    ext: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: convert lightweight text/data files (TXT, CSV, JSON, XML, etc.)."""
    return _run_markdown_conversion(
        self,
        input_path,
        task_id,
        original_filename,
        ext,
        user_id=user_id,
        usage_source=usage_source,
        api_key_id=api_key_id,
    )


@celery.task(
    bind=True,
    name="app.tasks.markdown_convert_tasks.convert_code_to_markdown_task",
    soft_time_limit=300,
    time_limit=360,
)
def convert_code_to_markdown_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    ext: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Async task: convert ZIP/code project archives into an AI project context."""
    return _run_markdown_conversion(
        self,
        input_path,
        task_id,
        original_filename,
        ext,
        user_id=user_id,
        usage_source=usage_source,
        api_key_id=api_key_id,
    )
