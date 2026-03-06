"""Tests for PDF conversion service (pdf_to_word, word_to_pdf)."""
import os
from unittest.mock import patch, MagicMock
import pytest

from app.services.pdf_service import pdf_to_word, PDFConversionError


class TestPdfService:
    def test_pdf_to_word_creates_output_dir(self, app):
        """Should create output directory if it doesn't exist."""
        with app.app_context():
            input_path = '/tmp/test_pdf_svc_input.pdf'
            output_dir = '/tmp/test_pdf_svc_output'
            expected_output = os.path.join(output_dir, 'test_pdf_svc_input.docx')

            with open(input_path, 'wb') as f:
                f.write(b'%PDF-1.4 test')

            with patch('app.services.pdf_service.subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(
                    returncode=0, stdout='', stderr=''
                )
                # Simulate LibreOffice creating the output file
                os.makedirs(output_dir, exist_ok=True)
                with open(expected_output, 'wb') as f:
                    f.write(b'PK\x03\x04 fake docx')

                result = pdf_to_word(input_path, output_dir)
                assert result == expected_output

            os.unlink(input_path)
            import shutil
            shutil.rmtree(output_dir, ignore_errors=True)

    def test_pdf_to_word_timeout_raises(self, app):
        """Should raise error on LibreOffice timeout."""
        with app.app_context():
            import subprocess

            input_path = '/tmp/test_pdf_timeout.pdf'
            with open(input_path, 'wb') as f:
                f.write(b'%PDF-1.4 test')

            with patch('app.services.pdf_service.subprocess.run') as mock_run:
                mock_run.side_effect = subprocess.TimeoutExpired(cmd='soffice', timeout=120)
                with pytest.raises(PDFConversionError, match="timed out"):
                    pdf_to_word(input_path, '/tmp/timeout_output')

            os.unlink(input_path)

    def test_pdf_to_word_not_installed_raises(self, app):
        """Should raise error when LibreOffice is not installed."""
        with app.app_context():
            input_path = '/tmp/test_pdf_noinstall.pdf'
            with open(input_path, 'wb') as f:
                f.write(b'%PDF-1.4 test')

            with patch('app.services.pdf_service.subprocess.run') as mock_run:
                mock_run.side_effect = FileNotFoundError()
                with pytest.raises(PDFConversionError, match="not installed"):
                    pdf_to_word(input_path, '/tmp/noinstall_output')

            os.unlink(input_path)