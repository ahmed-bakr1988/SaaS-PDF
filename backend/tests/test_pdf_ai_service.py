"""Service-level tests for PDF AI helpers."""
import pytest

from app.services.pdf_ai_service import PdfAiError, _extract_text_from_pdf


def test_extract_text_from_pdf_rejects_password_protected_documents(monkeypatch):
    """Password-protected PDFs should surface a specific actionable error."""

    from app.services.pdf_runtime import PdfPasswordProtectedError

    def fake_extract_text_pages(input_path, max_pages=50):
        raise PdfPasswordProtectedError("This PDF is password-protected.")

    monkeypatch.setattr("app.services.pdf_ai_service.extract_text_pages", fake_extract_text_pages)

    with pytest.raises(PdfAiError) as exc:
        _extract_text_from_pdf("/tmp/protected.pdf")

    assert exc.value.error_code == "PDF_ENCRYPTED"
    assert "unlock" in exc.value.user_message.lower()
