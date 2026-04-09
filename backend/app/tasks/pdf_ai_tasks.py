"""Celery tasks for PDF AI tools — Chat, Summarize, Translate, Table Extract."""

import os
import logging
import json

from flask import current_app

from app.extensions import celery
from app.services.pdf_ai_service import (
    chat_with_pdf,
    summarize_pdf,
    translate_pdf,
    extract_tables,
    PdfAiError,
    _build_translated_pdf,
)
from app.services.pdf_translate_layout_service import translate_pdf_layout
from app.services.pdf_translate_vision_service import translate_pdf_vision
from app.services.storage_service import storage
from app.services.task_tracking_service import finalize_task_tracking
from app.services.translation_guardrails import (
    get_cached_translation,
    store_cached_translation,
)
from app.utils.sanitizer import cleanup_task_files, get_output_path

logger = logging.getLogger(__name__)


def _cleanup(task_id: str):
    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)


def _build_pdf_ai_error_payload(task_id: str, error: PdfAiError, tool: str) -> dict:
    """Build a normalized error payload for AI tasks and emit structured logs."""
    payload = {
        "status": "failed",
        "error_code": getattr(error, "error_code", "PDF_AI_ERROR"),
        "user_message": getattr(error, "user_message", str(error))
        or "AI processing failed.",
        "task_id": task_id,
    }

    detail = getattr(error, "detail", None)
    if detail:
        payload["detail"] = detail

    logger.error(
        json.dumps(
            {
                "event": "pdf_ai_task_failed",
                "tool": tool,
                "task_id": task_id,
                "error_code": payload["error_code"],
                "user_message": payload["user_message"],
                "detail": detail,
            },
            ensure_ascii=False,
        )
    )
    return payload


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
            user_id=user_id,
            tool="chat-pdf",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        result = _build_pdf_ai_error_payload(task_id, e, "chat-pdf")
        finalize_task_tracking(
            user_id=user_id,
            tool="chat-pdf",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        result = {"status": "failed", "error": "An unexpected error occurred."}
        finalize_task_tracking(
            user_id=user_id,
            tool="chat-pdf",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
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
            user_id=user_id,
            tool="summarize-pdf",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        result = _build_pdf_ai_error_payload(task_id, e, "summarize-pdf")
        finalize_task_tracking(
            user_id=user_id,
            tool="summarize-pdf",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        result = {"status": "failed", "error": "An unexpected error occurred."}
        finalize_task_tracking(
            user_id=user_id,
            tool="summarize-pdf",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
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
    source_language: str | None = None,
    model_id: str | None = None,
    mode: str = "text",
    user_id: int | None = None,
    usage_source: str = "web",
    api_key_id: int | None = None,
):
    """Translate a PDF document to another language and return a downloadable PDF.

    Modes:
      - text  : Existing AI text extraction + fpdf2 rebuild (free & pro).
      - layout: pdf2docx → translate paragraphs → LibreOffice → PDF (pro only).
      - vision: pdf2image → Vision AI per page → weasyprint → PDF (pro only).
    """
    tool_slug = {
        "text": "translate-pdf",
        "layout": "translate-pdf-layout",
        "vision": "translate-pdf-vision",
    }.get(mode, "translate-pdf")

    try:
        output_path = get_output_path(task_id, "pdf")
        name_without_ext = os.path.splitext(original_filename)[0]
        download_name = f"{name_without_ext}_translated_{target_language}.pdf"

        # ── Mode: layout (Pro) ──────────────────────────────────────────
        if mode == "layout":
            self.update_state(
                state="PROCESSING",
                meta={"step": "Layout-preserving translation (pdf2docx → LibreOffice)..."},
            )
            data = translate_pdf_layout(
                input_path,
                target_language,
                output_path,
                original_filename,
                source_lang=source_language,
                model_id=model_id,
            )
            result = {
                "status": "completed",
                "download_url": None,  # filled below
                "filename": download_name,
                "pages_analyzed": data.get("pages", 0),
                "target_language": data["target_language"],
                "source_language": source_language,
                "provider": data.get("provider", "layout"),
                "paragraphs_translated": data.get("paragraphs_translated"),
            }

        # ── Mode: vision (Pro) ──────────────────────────────────────────
        elif mode == "vision":
            def _vision_progress(step: str):
                self.update_state(state="PROCESSING", meta={"step": step})

            self.update_state(
                state="PROCESSING",
                meta={"step": "Vision-based translation (per-page OCR + rebuild)..."},
            )
            data = translate_pdf_vision(
                input_path,
                target_language,
                output_path,
                original_filename,
                source_lang=source_language,
                model_id=model_id,
                progress_callback=_vision_progress,
            )
            result = {
                "status": "completed",
                "download_url": None,  # filled below
                "filename": download_name,
                "pages_analyzed": data.get("pages", 0),
                "target_language": data["target_language"],
                "source_language": source_language,
                "provider": data.get("provider", "vision"),
                "pages_translated": data.get("pages_translated"),
            }

        # ── Mode: text (default, free + pro) ────────────────────────────
        else:
            self.update_state(
                state="PROCESSING",
                meta={"step": "Translating document with provider fallback..."},
            )

            # Cache lookup — skip AI call if identical translation exists
            cached = get_cached_translation(
                input_path, target_language, source_language or "auto"
            )
            if cached is not None:
                data = cached
                data["provider"] = f"{data.get('provider', 'unknown')} (cached)"
            else:
                data = translate_pdf(
                    input_path,
                    target_language,
                    source_language=source_language,
                    model_id=model_id,
                )
                store_cached_translation(
                    input_path,
                    target_language,
                    source_language or "auto",
                    data,
                )

            # Build translated PDF output
            self.update_state(state="PROCESSING", meta={"step": "Generating PDF output..."})
            _build_translated_pdf(
                data["translation"],
                target_language,
                output_path,
                original_filename,
            )

            result = {
                "status": "completed",
                "download_url": None,  # filled below
                "filename": download_name,
                "pages_analyzed": data["pages_analyzed"],
                "target_language": data["target_language"],
                "source_language": data.get("source_language"),
                "detected_source_language": data.get("detected_source_language"),
                "provider": data.get("provider"),
                "chunks_translated": data.get("chunks_translated"),
            }

        # ── Upload to storage and get download URL (all modes) ──────────
        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
        download_url = storage.generate_presigned_url(s3_key, original_filename=download_name)
        result["download_url"] = download_url
        result["mode"] = mode

        logger.info(f"Task {task_id}: PDF translate completed (mode={mode})")
        finalize_task_tracking(
            user_id=user_id,
            tool=tool_slug,
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        result = _build_pdf_ai_error_payload(task_id, e, tool_slug)
        finalize_task_tracking(
            user_id=user_id,
            tool=tool_slug,
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        result = {"status": "failed", "error": "An unexpected error occurred."}
        finalize_task_tracking(
            user_id=user_id,
            tool=tool_slug,
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
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
            user_id=user_id,
            tool="extract-tables",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except PdfAiError as e:
        result = _build_pdf_ai_error_payload(task_id, e, "extract-tables")
        finalize_task_tracking(
            user_id=user_id,
            tool="extract-tables",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result

    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error — {e}")
        result = {"status": "failed", "error": "An unexpected error occurred."}
        finalize_task_tracking(
            user_id=user_id,
            tool="extract-tables",
            original_filename=original_filename,
            result=result,
            usage_source=usage_source,
            api_key_id=api_key_id,
            celery_task_id=self.request.id,
        )
        _cleanup(task_id)
        return result
