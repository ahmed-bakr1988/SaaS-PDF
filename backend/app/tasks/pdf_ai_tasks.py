"""Celery tasks for PDF AI tools — Chat, Summarize, Translate, Table Extract."""
import os
import logging

from flask import current_app

from app.extensions import celery
from app.services.pdf_ai_service import (
    chat_with_pdf,
    summarize_pdf,
    translate_pdf,
    extract_tables,
    PdfAiError,
)
from app.services.task_tracking_service import finalize_task_tracking
from app.utils.sanitizer import cleanup_task_files

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=False)


# ---------------------------------------------------------------------------
# Chat with PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_ai_tasks.chat_with_pdf_task")
def chat_with_pdf_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    question: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Ask a question about a PDF document."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "Analyzing document..."})

        data = chat_with_pdf(input_path, question)

        result = {
            "status": "completed",
            "reply": data["reply"],
            "pages_analyzed": data["pages_analyzed"],
        }

        logger.info(f"Task {task_id}: Chat with PDF completed")
        finalize_task_tracking(
            user_id=user_id, tool="chat-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        logger.error(f"Task {task_id}: {e}")
        result = {"status": "failed", "error": str(e)}
        finalize_task_tracking(
            user_id=user_id, tool="chat-pdf",
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
            user_id=user_id, tool="chat-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result


# ---------------------------------------------------------------------------
# Summarize PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_ai_tasks.summarize_pdf_task")
def summarize_pdf_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    length: str = "medium",
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Generate a summary of a PDF document."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "Summarizing document..."})

        data = summarize_pdf(input_path, length)

        result = {
            "status": "completed",
            "summary": data["summary"],
            "pages_analyzed": data["pages_analyzed"],
        }

        logger.info(f"Task {task_id}: PDF summarize completed")
        finalize_task_tracking(
            user_id=user_id, tool="summarize-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        logger.error(f"Task {task_id}: {e}")
        result = {"status": "failed", "error": str(e)}
        finalize_task_tracking(
            user_id=user_id, tool="summarize-pdf",
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
            user_id=user_id, tool="summarize-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result


# ---------------------------------------------------------------------------
# Translate PDF
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_ai_tasks.translate_pdf_task")
def translate_pdf_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    target_language: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Translate a PDF document to another language."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "Translating document..."})

        data = translate_pdf(input_path, target_language)

        result = {
            "status": "completed",
            "translation": data["translation"],
            "pages_analyzed": data["pages_analyzed"],
            "target_language": data["target_language"],
        }

        logger.info(f"Task {task_id}: PDF translate completed")
        finalize_task_tracking(
            user_id=user_id, tool="translate-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        logger.error(f"Task {task_id}: {e}")
        result = {"status": "failed", "error": str(e)}
        finalize_task_tracking(
            user_id=user_id, tool="translate-pdf",
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
            user_id=user_id, tool="translate-pdf",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result


# ---------------------------------------------------------------------------
# Extract Tables
# ---------------------------------------------------------------------------
@celery.task(bind=True, name="app.tasks.pdf_ai_tasks.extract_tables_task")
def extract_tables_task(
    self,
    input_path: str,
    task_id: str,
    original_filename: str,
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Extract tables from a PDF document."""
    try:
        self.update_state(state="PROCESSING", meta={"step": "Extracting tables..."})

        data = extract_tables(input_path)

        result = {
            "status": "completed",
            "tables": data["tables"],
            "tables_found": data["tables_found"],
        }

        logger.info(f"Task {task_id}: Table extraction completed")
        finalize_task_tracking(
            user_id=user_id, tool="extract-tables",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        logger.error(f"Task {task_id}: {e}")
        result = {"status": "failed", "error": str(e)}
        finalize_task_tracking(
            user_id=user_id, tool="extract-tables",
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
            user_id=user_id, tool="extract-tables",
            original_filename=original_filename, result=result,
            usage_source=usage_source, api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result
