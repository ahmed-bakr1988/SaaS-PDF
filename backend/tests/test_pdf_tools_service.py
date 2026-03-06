"""Tests for PDF tools service — Merge, Split, Rotate, etc."""
import os
import pytest
from unittest.mock import patch, MagicMock

from app.services.pdf_tools_service import (
    merge_pdfs,
    split_pdf,
    PDFToolsError,
)


class TestMergePdfsService:
    def test_merge_file_not_found_raises(self, app):
        """Should raise when input file doesn't exist."""
        with app.app_context():
            with pytest.raises(PDFToolsError, match="not found"):
                merge_pdfs(
                    ['/tmp/nonexistent1.pdf', '/tmp/nonexistent2.pdf'],
                    '/tmp/merged_output.pdf',
                )

    def test_merge_success(self, app, tmp_path):
        """Should merge PDF files successfully."""
        with app.app_context():
            # Create test PDFs using PyPDF2
            try:
                from PyPDF2 import PdfWriter

                pdf1 = str(tmp_path / 'a.pdf')
                pdf2 = str(tmp_path / 'b.pdf')

                for path in [pdf1, pdf2]:
                    writer = PdfWriter()
                    writer.add_blank_page(width=612, height=792)
                    with open(path, 'wb') as f:
                        writer.write(f)

                output = str(tmp_path / 'merged.pdf')
                result = merge_pdfs([pdf1, pdf2], output)

                assert result['total_pages'] == 2
                assert result['files_merged'] == 2
                assert result['output_size'] > 0
                assert os.path.exists(output)
            except ImportError:
                pytest.skip("PyPDF2 not installed")


class TestSplitPdfService:
    def test_split_all_pages(self, app, tmp_path):
        """Should split PDF into individual pages."""
        with app.app_context():
            try:
                from PyPDF2 import PdfWriter

                # Create 3-page PDF
                input_path = str(tmp_path / 'multi.pdf')
                writer = PdfWriter()
                for _ in range(3):
                    writer.add_blank_page(width=612, height=792)
                with open(input_path, 'wb') as f:
                    writer.write(f)

                output_dir = str(tmp_path / 'split_output')
                result = split_pdf(input_path, output_dir, mode='all')

                assert result['total_pages'] == 3
                assert result['extracted_pages'] == 3
                assert os.path.exists(result['zip_path'])
            except ImportError:
                pytest.skip("PyPDF2 not installed")

    def test_split_range_out_of_bounds_includes_total_pages(self, app, tmp_path):
        """Should raise a clear error when requested pages exceed document page count."""
        with app.app_context():
            try:
                from PyPDF2 import PdfWriter

                input_path = str(tmp_path / 'single-page.pdf')
                writer = PdfWriter()
                writer.add_blank_page(width=612, height=792)
                with open(input_path, 'wb') as f:
                    writer.write(f)

                output_dir = str(tmp_path / 'split_output')

                with pytest.raises(PDFToolsError, match='has only 1 page'):
                    split_pdf(input_path, output_dir, mode='range', pages='1-2')
            except ImportError:
                pytest.skip("PyPDF2 not installed")

    def test_split_range_invalid_format_returns_clear_message(self, app, tmp_path):
        """Should raise a clear error for malformed page ranges."""
        with app.app_context():
            try:
                from PyPDF2 import PdfWriter

                input_path = str(tmp_path / 'two-pages.pdf')
                writer = PdfWriter()
                writer.add_blank_page(width=612, height=792)
                writer.add_blank_page(width=612, height=792)
                with open(input_path, 'wb') as f:
                    writer.write(f)

                output_dir = str(tmp_path / 'split_output')

                with pytest.raises(PDFToolsError, match='Invalid page format'):
                    split_pdf(input_path, output_dir, mode='range', pages='1-2-3')
            except ImportError:
                pytest.skip("PyPDF2 not installed")