"""Tests for PDF compression service."""
import os
from unittest.mock import patch, MagicMock
import pytest

from app.services.compress_service import compress_pdf, PDFCompressionError


class TestCompressService:
    def test_compress_pdf_invalid_quality_defaults(self, app):
        """Invalid quality should default to medium."""
        with app.app_context():
            with patch('app.services.compress_service.subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(returncode=0, stderr='')
                # Create temp input file
                input_path = '/tmp/test_compress_input.pdf'
                output_path = '/tmp/test_compress_output.pdf'
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with open(input_path, 'wb') as f:
                    f.write(b'%PDF-1.4 test')
                with open(output_path, 'wb') as f:
                    f.write(b'%PDF-1.4 compressed')

                result = compress_pdf(input_path, output_path, quality="invalid")
                # Should have used "medium" default (/ebook)
                cmd_args = mock_run.call_args[0][0]
                assert any('/ebook' in str(arg) for arg in cmd_args)

                # Cleanup
                os.unlink(input_path)
                os.unlink(output_path)

    def test_compress_pdf_returns_stats(self, app):
        """Should return original_size, compressed_size, reduction_percent."""
        with app.app_context():
            input_path = '/tmp/test_stats_input.pdf'
            output_path = '/tmp/test_stats_output.pdf'

            # Create input (100 bytes)
            with open(input_path, 'wb') as f:
                f.write(b'%PDF-1.4' + b'\x00' * 92)

            with patch('app.services.compress_service.subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(returncode=0, stderr='')
                # Create smaller output (50 bytes)
                with open(output_path, 'wb') as f:
                    f.write(b'%PDF-1.4' + b'\x00' * 42)

                result = compress_pdf(input_path, output_path, 'medium')
                assert 'original_size' in result
                assert 'compressed_size' in result
                assert result['original_size'] == 100
                assert result['compressed_size'] == 50

            os.unlink(input_path)
            os.unlink(output_path)

    def test_compress_pdf_gs_failure_raises(self, app):
        """Should raise PDFCompressionError when Ghostscript fails."""
        with app.app_context():
            input_path = '/tmp/test_fail_input.pdf'
            output_path = '/tmp/test_fail_output.pdf'

            with open(input_path, 'wb') as f:
                f.write(b'%PDF-1.4 test')

            with patch('app.services.compress_service.subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(
                    returncode=1, stderr='Error processing PDF'
                )
                with pytest.raises(PDFCompressionError):
                    compress_pdf(input_path, output_path, 'medium')

            os.unlink(input_path)