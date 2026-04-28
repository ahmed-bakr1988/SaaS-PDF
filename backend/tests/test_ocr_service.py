"""Tests for OCR service and PDF editor service — unit tests with mocking."""
import sys

import pytest
from unittest.mock import patch, MagicMock

from app.services.ocr_service import ocr_image, ocr_pdf, OCRError, SUPPORTED_LANGUAGES


class TestOcrServiceConstants:
    def test_supported_languages(self):
        """Verify the supported languages dict."""
        assert "eng" in SUPPORTED_LANGUAGES
        assert "ara" in SUPPORTED_LANGUAGES
        assert "fra" in SUPPORTED_LANGUAGES
        assert len(SUPPORTED_LANGUAGES) == 3


class TestOcrImage:
    def test_ocr_image_success(self):
        """Should return text and char_count from image (mocked pytesseract)."""
        mock_pytesseract = MagicMock()
        mock_pytesseract.image_to_string.return_value = "  Hello World  "
        mock_pytesseract.pytesseract.tesseract_cmd = ""

        mock_img = MagicMock()
        mock_img.mode = "RGB"
        mock_img.__enter__ = MagicMock(return_value=mock_img)
        mock_img.__exit__ = MagicMock(return_value=False)

        with patch.dict(sys.modules, {"pytesseract": mock_pytesseract}):
            with patch("app.services.ocr_service.Image") as mock_pil:
                mock_pil.open.return_value = mock_img
                result = ocr_image("/fake/path.png", lang="eng")

        assert result["text"] == "Hello World"
        assert result["char_count"] == 11
        assert result["lang"] == "eng"

    def test_ocr_image_invalid_lang_fallback(self):
        """Invalid language should fall back to 'eng'."""
        mock_pytesseract = MagicMock()
        mock_pytesseract.image_to_string.return_value = "Test"
        mock_pytesseract.pytesseract.tesseract_cmd = ""

        mock_img = MagicMock()
        mock_img.mode = "RGB"
        mock_img.__enter__ = MagicMock(return_value=mock_img)
        mock_img.__exit__ = MagicMock(return_value=False)

        with patch.dict(sys.modules, {"pytesseract": mock_pytesseract}):
            with patch("app.services.ocr_service.Image") as mock_pil:
                mock_pil.open.return_value = mock_img
                result = ocr_image("/fake/path.png", lang="zzzz")

        assert result["lang"] == "eng"


class TestPdfEditorService:
    def test_no_edits_raises(self):
        """Should raise PDFEditorError when no edits provided."""
        from app.services.pdf_editor_service import apply_pdf_edits, PDFEditorError
        with pytest.raises(PDFEditorError, match="No edits"):
            apply_pdf_edits("/fake.pdf", "/out.pdf", [])


class TestOcrPdf:
    def test_ocr_pdf_uses_render_runtime_and_writes_output(self, tmp_path):
        """PDF OCR should use the shared renderer path and persist extracted text."""
        mock_pytesseract = MagicMock()
        mock_pytesseract.image_to_string.side_effect = ["Page one", "Page two"]
        mock_pytesseract.pytesseract.tesseract_cmd = ""

        fake_images = [MagicMock(mode="RGB"), MagicMock(mode="RGB")]
        output_path = tmp_path / "ocr.txt"

        with patch.dict(sys.modules, {"pytesseract": mock_pytesseract}):
            with patch("app.services.ocr_service.render_pdf_pages", return_value=fake_images):
                result = ocr_pdf("/fake/input.pdf", str(output_path), lang="eng")

        assert result["page_count"] == 2
        assert "Page one" in result["text"]
        assert "Page two" in result["text"]
        assert output_path.exists()
