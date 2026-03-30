"""Tests for file validation utility."""

import io
from unittest.mock import MagicMock
from app.utils.file_validator import validate_file, FileValidationError
import pytest


class TestFileValidator:
    def test_no_file_raises(self, app):
        """Should raise when no file provided."""
        with app.app_context():
            with pytest.raises(FileValidationError, match="No file provided"):
                validate_file(None, allowed_types=["pdf"])

    def test_empty_filename_raises(self, app):
        """Should raise when filename is empty."""
        with app.app_context():
            mock_file = MagicMock()
            mock_file.filename = ""
            with pytest.raises(FileValidationError, match="No file provided"):
                validate_file(mock_file, allowed_types=["pdf"])

    def test_wrong_extension_raises(self, app):
        """Should raise when file extension is not allowed."""
        with app.app_context():
            mock_file = MagicMock()
            mock_file.filename = "test.exe"
            with pytest.raises(FileValidationError, match="not allowed"):
                validate_file(mock_file, allowed_types=["pdf"])

    def test_empty_file_raises(self, app):
        """Should raise when file is empty (0 bytes)."""
        with app.app_context():
            content = io.BytesIO(b"")
            mock_file = MagicMock()
            mock_file.filename = "test.pdf"
            mock_file.seek = content.seek
            mock_file.tell = content.tell
            mock_file.read = content.read
            with pytest.raises(FileValidationError, match="empty"):
                validate_file(mock_file, allowed_types=["pdf"])

    def test_valid_pdf_passes(self, app):
        """Should accept valid PDF file with correct magic bytes."""
        with app.app_context():
            pdf_bytes = b"%PDF-1.4 test content" + b"\x00" * 8192
            content = io.BytesIO(pdf_bytes)

            mock_file = MagicMock()
            mock_file.filename = "document.pdf"
            mock_file.seek = content.seek
            mock_file.tell = content.tell
            mock_file.read = content.read

            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setattr(
                    "app.utils.file_validator._detect_mime",
                    lambda _header: "application/pdf",
                )
                filename, ext = validate_file(mock_file, allowed_types=["pdf"])

            assert filename == "document.pdf"
            assert ext == "pdf"

    def test_valid_html_passes(self, app):
        """Should accept valid HTML file with correct MIME type."""
        with app.app_context():
            html_bytes = b"<!doctype html><html><body>Hello</body></html>"
            content = io.BytesIO(html_bytes)

            mock_file = MagicMock()
            mock_file.filename = "page.html"
            mock_file.seek = content.seek
            mock_file.tell = content.tell
            mock_file.read = content.read

            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setattr(
                    "app.utils.file_validator._detect_mime",
                    lambda _header: "text/html",
                )
                filename, ext = validate_file(mock_file, allowed_types=["html", "htm"])

            assert filename == "page.html"
            assert ext == "html"

    def test_mime_mismatch_raises(self, app):
        """Should raise when MIME type doesn't match extension."""
        with app.app_context():
            content = io.BytesIO(b"not a real pdf" + b"\x00" * 8192)

            mock_file = MagicMock()
            mock_file.filename = "fake.pdf"
            mock_file.seek = content.seek
            mock_file.tell = content.tell
            mock_file.read = content.read

            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setattr(
                    "app.utils.file_validator._detect_mime",
                    lambda _header: "text/plain",
                )
                with pytest.raises(FileValidationError, match="does not match"):
                    validate_file(mock_file, allowed_types=["pdf"])

    def test_file_too_large_raises(self, app):
        """Should raise when file exceeds size limit."""
        with app.app_context():
            # Use a small override to keep the test stable on Windows/Python 3.13.
            large_content = io.BytesIO(b"%PDF-1.4" + b"\x00" * 2048)

            mock_file = MagicMock()
            mock_file.filename = "large.pdf"
            mock_file.seek = large_content.seek
            mock_file.tell = large_content.tell
            mock_file.read = large_content.read

            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setattr(
                    "app.utils.file_validator._detect_mime",
                    lambda _header: "application/pdf",
                )
                with pytest.raises(FileValidationError, match="too large"):
                    validate_file(
                        mock_file,
                        allowed_types=["pdf"],
                        size_limit_overrides={"pdf": 1024},
                    )

    def test_dangerous_pdf_raises(self, app):
        """Should raise when PDF contains dangerous patterns."""
        with app.app_context():
            pdf_bytes = b"%PDF-1.4 /JavaScript evil_code" + b"\x00" * 8192
            content = io.BytesIO(pdf_bytes)

            mock_file = MagicMock()
            mock_file.filename = "evil.pdf"
            mock_file.seek = content.seek
            mock_file.tell = content.tell
            mock_file.read = content.read

            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setattr(
                    "app.utils.file_validator._detect_mime",
                    lambda _header: "application/pdf",
                )
                with pytest.raises(FileValidationError, match="unsafe"):
                    validate_file(mock_file, allowed_types=["pdf"])

    def test_pdf_with_missing_extension_name_is_inferred(self, app):
        """Should infer PDF extension from content when filename lacks one."""
        with app.app_context():
            pdf_bytes = b"%PDF-1.4 test content" + b"\x00" * 8192
            content = io.BytesIO(pdf_bytes)

            mock_file = MagicMock()
            mock_file.filename = "."
            mock_file.seek = content.seek
            mock_file.tell = content.tell
            mock_file.read = content.read

            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setattr(
                    "app.utils.file_validator._detect_mime",
                    lambda _header: "application/pdf",
                )
                filename, ext = validate_file(mock_file, allowed_types=["pdf"])

            assert filename == "upload.pdf"
            assert ext == "pdf"

    def test_pdf_hidden_filename_keeps_pdf_extension(self, app):
        """Should preserve .pdf from hidden-style filenames like .pdf."""
        with app.app_context():
            pdf_bytes = b"%PDF-1.4 test content" + b"\x00" * 8192
            content = io.BytesIO(pdf_bytes)

            mock_file = MagicMock()
            mock_file.filename = ".pdf"
            mock_file.seek = content.seek
            mock_file.tell = content.tell
            mock_file.read = content.read

            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setattr(
                    "app.utils.file_validator._detect_mime",
                    lambda _header: "application/pdf",
                )
                filename, ext = validate_file(mock_file, allowed_types=["pdf"])

            assert filename == "upload.pdf"
            assert ext == "pdf"
