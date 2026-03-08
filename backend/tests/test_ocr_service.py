"""Tests for OCR service and PDF editor service — unit tests with mocking."""
import os
import sys
import tempfile

import pytest
from unittest.mock import patch, MagicMock

from app.services.ocr_service import ocr_image, OCRError, SUPPORTED_LANGUAGES


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
