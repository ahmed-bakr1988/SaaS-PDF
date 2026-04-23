"""Tests for HTML to PDF endpoint — POST /api/convert/html-to-pdf."""
import io
from unittest.mock import MagicMock

import pytest

from app.services.html_to_pdf_service import (
    HtmlToPdfError,
    _get_dependency_mismatch_error,
    html_to_pdf,
    parse_html_to_pdf_render_options,
)


class TestHtmlToPdf:
    def test_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/convert/html-to-pdf')
        assert response.status_code == 400

    def test_success(self, client, monkeypatch):
        """Should return 202 with task_id on valid HTML upload."""
        mock_task = MagicMock()
        mock_task.id = 'html-pdf-task-id'
        delay_mock = MagicMock(return_value=mock_task)
        monkeypatch.setattr(
            'app.routes.html_to_pdf.validate_actor_file',
            lambda f, allowed_types, actor: ('test.html', 'html'),
        )
        monkeypatch.setattr(
            'app.routes.html_to_pdf.generate_safe_path',
            lambda ext, folder_type: ('html-pdf-task-id', '/tmp/mock.html'),
        )
        monkeypatch.setattr(
            'app.routes.html_to_pdf.html_to_pdf_task.delay',
            delay_mock,
        )
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        data = {
            'file': (io.BytesIO(b'<html><body>Hello</body></html>'), 'test.html'),
        }
        response = client.post(
            '/api/convert/html-to-pdf',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        json_data = response.get_json()
        assert 'task_id' in json_data
        assert delay_mock.call_args.kwargs['render_options'] == {
            'source_kind': 'html',
            'entry_html': None,
            'page_format': 'A4',
            'landscape': False,
            'print_background': True,
            'prefer_css_page_size': True,
            'margin_top': '0',
            'margin_right': '0',
            'margin_bottom': '0',
            'margin_left': '0',
        }

    def test_success_accepts_zip_bundle_and_render_options(self, client, monkeypatch):
        """Should accept ZIP bundles and pass normalized render options to the task."""
        mock_task = MagicMock()
        mock_task.id = 'html-pdf-task-id'
        delay_mock = MagicMock(return_value=mock_task)
        monkeypatch.setattr(
            'app.routes.html_to_pdf.validate_actor_file',
            lambda f, allowed_types, actor: ('site.zip', 'zip'),
        )
        monkeypatch.setattr(
            'app.routes.html_to_pdf.generate_safe_path',
            lambda ext, folder_type: ('html-pdf-task-id', '/tmp/mock.zip'),
        )
        monkeypatch.setattr(
            'app.routes.html_to_pdf.html_to_pdf_task.delay',
            delay_mock,
        )
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        data = {
            'file': (io.BytesIO(b'PK\x03\x04test-zip'), 'site.zip'),
            'entry_html': 'pages/home.html',
            'page_format': 'Letter',
            'orientation': 'landscape',
            'margin_top': '1cm',
            'margin_right': '12mm',
            'margin_bottom': '1cm',
            'margin_left': '12mm',
            'print_background': 'false',
        }
        response = client.post(
            '/api/convert/html-to-pdf',
            data=data,
            content_type='multipart/form-data',
        )

        assert response.status_code == 202
        assert delay_mock.call_args.kwargs['render_options'] == {
            'source_kind': 'archive',
            'entry_html': 'pages/home.html',
            'page_format': 'Letter',
            'landscape': True,
            'print_background': False,
            'prefer_css_page_size': True,
            'margin_top': '1cm',
            'margin_right': '12mm',
            'margin_bottom': '1cm',
            'margin_left': '12mm',
        }

    def test_rejects_invalid_render_options(self, client, monkeypatch):
        """Should return 400 when PDF render options are invalid."""
        monkeypatch.setattr(
            'app.routes.html_to_pdf.validate_actor_file',
            lambda f, allowed_types, actor: ('test.html', 'html'),
        )

        data = {
            'file': (io.BytesIO(b'<html><body>Hello</body></html>'), 'test.html'),
            'margin_top': '-1cm',
        }
        response = client.post(
            '/api/convert/html-to-pdf',
            data=data,
            content_type='multipart/form-data',
        )

        assert response.status_code == 400
        assert 'Margins must be non-negative values' in response.get_json()['error']

    def test_parse_render_options_for_archive(self):
        """Should normalize browser-rendered PDF options for ZIP bundles."""
        options = parse_html_to_pdf_render_options(
            {
                'entry_html': 'nested/index.html',
                'page_format': 'a5',
                'orientation': 'landscape',
                'print_background': 'true',
                'margin_top': '10mm',
            },
            'zip',
        )

        assert options.source_kind == 'archive'
        assert options.entry_html == 'nested/index.html'
        assert options.page_format == 'A5'
        assert options.landscape is True
        assert options.print_background is True
        assert options.margin_top == '10mm'

    def test_html_to_pdf_falls_back_to_weasyprint_for_simple_html(self, monkeypatch, tmp_path):
        """Should keep simple HTML conversions working when Playwright is unavailable."""
        input_path = tmp_path / 'input.html'
        input_path.write_text('<html><body>Hello</body></html>', encoding='utf-8')
        output_path = tmp_path / 'output.pdf'

        playwright_mock = MagicMock(side_effect=HtmlToPdfError('playwright missing'))
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._select_renderer',
            lambda: 'auto',
        )
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._render_with_playwright',
            playwright_mock,
        )

        def fake_weasyprint(entry_path, target_path):
            assert entry_path == input_path
            output_path.write_bytes(b'%PDF-1.4\n')
            return {'output_size': output_path.stat().st_size, 'renderer': 'weasyprint'}

        weasyprint_mock = MagicMock(side_effect=fake_weasyprint)
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._render_with_weasyprint',
            weasyprint_mock,
        )

        result = html_to_pdf(str(input_path), str(output_path))

        assert result['renderer'] == 'weasyprint'
        assert output_path.exists()
        playwright_mock.assert_called_once()
        weasyprint_mock.assert_called_once()

    def test_html_to_pdf_does_not_fallback_to_weasyprint_for_archives(self, monkeypatch, tmp_path):
        """Should require the browser renderer for ZIP bundle conversions."""
        input_path = tmp_path / 'site.zip'
        input_path.write_bytes(b'PK\x03\x04')
        output_path = tmp_path / 'output.pdf'

        monkeypatch.setattr(
            'app.services.html_to_pdf_service._prepare_render_source',
            lambda input_path, render_options: MagicMock(
                source_kind='archive',
                entry_path=tmp_path / 'index.html',
                source_root=tmp_path,
            ),
        )
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._select_renderer',
            lambda: 'auto',
        )
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._render_with_playwright',
            MagicMock(side_effect=HtmlToPdfError('playwright failed')),
        )
        weasyprint_mock = MagicMock()
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._render_with_weasyprint',
            weasyprint_mock,
        )

        with pytest.raises(HtmlToPdfError, match='playwright failed'):
            html_to_pdf(
                str(input_path),
                str(output_path),
                render_options={'source_kind': 'archive', 'entry_html': 'index.html'},
            )

        weasyprint_mock.assert_not_called()

    def test_detects_weasyprint_pydyf_version_mismatch(self, monkeypatch):
        """Should flag the known WeasyPrint/pydyf incompatibility."""
        versions = {
            'weasyprint': '61.2',
            'pydyf': '0.12.1',
        }
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._get_installed_version',
            lambda package_name: versions.get(package_name),
        )

        error = _get_dependency_mismatch_error()

        assert error is not None
        assert 'WeasyPrint 61.2' in error
        assert 'pydyf 0.12.1' in error

    def test_allows_compatible_weasyprint_pydyf_versions(self, monkeypatch):
        """Should not flag compatible dependency versions."""
        versions = {
            'weasyprint': '61.2',
            'pydyf': '0.10.0',
        }
        monkeypatch.setattr(
            'app.services.html_to_pdf_service._get_installed_version',
            lambda package_name: versions.get(package_name),
        )

        assert _get_dependency_mismatch_error() is None
