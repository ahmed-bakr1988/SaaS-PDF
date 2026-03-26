"""Service-level tests for PDF AI helpers."""
import pytest

from app.services.pdf_ai_service import PdfAiError, _extract_text_from_pdf


def test_extract_text_from_pdf_rejects_password_protected_documents(monkeypatch):
    """Password-protected PDFs should surface a specific actionable error."""

    class FakeReader:
        def __init__(self, input_path):
            self.is_encrypted = True
            self.pages = []

        def decrypt(self, password):
            return 0

    monkeypatch.setattr("PyPDF2.PdfReader", FakeReader)

    with pytest.raises(PdfAiError) as exc:
        _extract_text_from_pdf("/tmp/protected.pdf")

    assert exc.value.error_code == "PDF_ENCRYPTED"
    assert "unlock" in exc.value.user_message.lower()
