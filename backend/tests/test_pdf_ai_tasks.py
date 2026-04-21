"""Tests for PDF AI Celery task error payloads."""
from app.services.pdf_ai_service import PdfAiError
from app.tasks.pdf_ai_tasks import _build_pdf_ai_error_payload


def test_build_pdf_ai_error_payload_contains_classified_fields():
    """Should include error_code and user_message for task status normalization."""
    error = PdfAiError(
        "AI service is experiencing high demand. Please wait a moment and try again.",
        error_code="AI_RATE_LIMIT",
    )

    payload = _build_pdf_ai_error_payload("task-123", error, "chat-pdf")

    assert payload["status"] == "failed"
    assert payload["error_code"] == "AI_RATE_LIMIT"
    assert "user_message" in payload
    assert payload["task_id"] == "task-123"


def test_build_pdf_ai_error_payload_includes_detail_when_available():
    """Should preserve machine-searchable detail context when provided."""
    error = PdfAiError(
        "Failed to extract text from PDF.",
        error_code="PDF_TEXT_EXTRACTION_FAILED",
        detail="EOF marker not found",
    )

    payload = _build_pdf_ai_error_payload("task-456", error, "summarize-pdf")

    assert payload["error_code"] == "PDF_TEXT_EXTRACTION_FAILED"
    assert payload["detail"] == "EOF marker not found"
