"""Tests for ALL PDF tools routes — Merge, Split, Rotate, Page Numbers, PDF↔Images, Watermark, Protect, Unlock."""
import io
import os
import tempfile
from unittest.mock import patch, MagicMock


# =========================================================================
# Helper: create mock for validate_file + celery task
# =========================================================================
def _mock_validate_and_task(monkeypatch, task_module_path, task_name):
    """Shared helper: mock validate_file to pass, mock the celery task,
    and ensure file.save() works by using a real temp directory."""
    mock_task = MagicMock()
    mock_task.id = 'mock-task-id'

    # Create a real temp dir so file.save() works
    tmp_dir = tempfile.mkdtemp()
    save_path = os.path.join(tmp_dir, 'mock.pdf')

    # Mock file validator to accept any file
    monkeypatch.setattr(
        'app.routes.pdf_tools.validate_file',
        lambda f, allowed_types: ('test.pdf', 'pdf'),
    )
    monkeypatch.setattr(
        'app.routes.pdf_tools.generate_safe_path',
        lambda ext, folder_type: ('mock-task-id', save_path),
    )

    # Mock the celery task delay
    mock_delay = MagicMock(return_value=mock_task)
    monkeypatch.setattr(f'app.routes.pdf_tools.{task_name}.delay', mock_delay)

    return mock_task, mock_delay


# =========================================================================
# 1. Merge PDFs — POST /api/pdf-tools/merge
# =========================================================================
class TestMergePdfs:
    def test_merge_no_files(self, client):
        """Should return 400 when no files provided."""
        response = client.post('/api/pdf-tools/merge')
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_merge_single_file(self, client):
        """Should return 400 when only one file provided."""
        data = {'files': (io.BytesIO(b'%PDF-1.4 test'), 'test.pdf')}
        response = client.post(
            '/api/pdf-tools/merge',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert 'at least 2' in response.get_json()['error'].lower()

    def test_merge_success(self, client, monkeypatch):
        """Should return 202 with task_id when valid PDFs provided."""
        mock_task = MagicMock()
        mock_task.id = 'merge-task-id'
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        monkeypatch.setattr(
            'app.routes.pdf_tools.merge_pdfs_task.delay',
            MagicMock(return_value=mock_task),
        )
        # Mock os.makedirs and FileStorage.save so nothing touches disk
        monkeypatch.setattr('app.routes.pdf_tools.os.makedirs', lambda *a, **kw: None)
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )

        data = {
            'files': [
                (io.BytesIO(b'%PDF-1.4 file1'), 'a.pdf'),
                (io.BytesIO(b'%PDF-1.4 file2'), 'b.pdf'),
            ]
        }
        response = client.post(
            '/api/pdf-tools/merge',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body['task_id'] == 'merge-task-id'
        assert 'message' in body

    def test_merge_too_many_files(self, client, monkeypatch):
        """Should return 400 when more than 20 files provided."""
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        data = {
            'files': [
                (io.BytesIO(b'%PDF-1.4'), f'file{i}.pdf')
                for i in range(21)
            ]
        }
        response = client.post(
            '/api/pdf-tools/merge',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert '20' in response.get_json()['error']


# =========================================================================
# 2. Split PDF — POST /api/pdf-tools/split
# =========================================================================
class TestSplitPdf:
    def test_split_no_file(self, client):
        """Should return 400 when no file provided."""
        response = client.post('/api/pdf-tools/split')
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'No file provided.'

    def test_split_success_all_mode(self, client, monkeypatch):
        """Should accept file and return 202 with mode=all."""
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'split_pdf_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4 test'), 'test.pdf'),
            'mode': 'all',
        }
        response = client.post(
            '/api/pdf-tools/split',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        body = response.get_json()
        assert body['task_id'] == 'mock-task-id'

    def test_split_success_range_mode(self, client, monkeypatch):
        """Should accept file with mode=range and pages."""
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'split_pdf_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4 test'), 'test.pdf'),
            'mode': 'range',
            'pages': '1,3,5-8',
        }
        response = client.post(
            '/api/pdf-tools/split',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        mock_delay.assert_called_once()
        # Verify pages parameter was passed
        call_args = mock_delay.call_args
        assert call_args[0][4] == '1,3,5-8'  # pages arg

    def test_split_range_mode_requires_pages(self, client, monkeypatch):
        """Should return 400 when range mode is selected without pages."""
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )

        data = {
            'file': (io.BytesIO(b'%PDF-1.4 test'), 'test.pdf'),
            'mode': 'range',
        }
        response = client.post(
            '/api/pdf-tools/split',
            data=data,
            content_type='multipart/form-data',
        )

        assert response.status_code == 400
        assert 'specify which pages to extract' in response.get_json()['error'].lower()


# =========================================================================
# 3. Rotate PDF — POST /api/pdf-tools/rotate
# =========================================================================
class TestRotatePdf:
    def test_rotate_no_file(self, client):
        response = client.post('/api/pdf-tools/rotate')
        assert response.status_code == 400

    def test_rotate_invalid_degrees(self, client, monkeypatch):
        """Should reject invalid rotation angles."""
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'rotation': '45',
        }
        response = client.post(
            '/api/pdf-tools/rotate',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert '90, 180, or 270' in response.get_json()['error']

    def test_rotate_success(self, client, monkeypatch):
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'rotate_pdf_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'rotation': '90',
            'pages': 'all',
        }
        response = client.post(
            '/api/pdf-tools/rotate',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert response.get_json()['task_id'] == 'mock-task-id'


# =========================================================================
# 4. Page Numbers — POST /api/pdf-tools/page-numbers
# =========================================================================
class TestAddPageNumbers:
    def test_page_numbers_no_file(self, client):
        response = client.post('/api/pdf-tools/page-numbers')
        assert response.status_code == 400

    def test_page_numbers_success(self, client, monkeypatch):
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'add_page_numbers_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'position': 'bottom-center',
            'start_number': '1',
        }
        response = client.post(
            '/api/pdf-tools/page-numbers',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202

    def test_page_numbers_invalid_position_defaults(self, client, monkeypatch):
        """Invalid position should default to bottom-center."""
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'add_page_numbers_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'position': 'invalid-position',
        }
        response = client.post(
            '/api/pdf-tools/page-numbers',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        # Should have used default 'bottom-center'
        call_args = mock_delay.call_args[0]
        assert call_args[3] == 'bottom-center'


# =========================================================================
# 5. PDF to Images — POST /api/pdf-tools/pdf-to-images
# =========================================================================
class TestPdfToImages:
    def test_pdf_to_images_no_file(self, client):
        response = client.post('/api/pdf-tools/pdf-to-images')
        assert response.status_code == 400

    def test_pdf_to_images_success(self, client, monkeypatch):
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'pdf_to_images_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'format': 'png',
            'dpi': '200',
        }
        response = client.post(
            '/api/pdf-tools/pdf-to-images',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202

    def test_pdf_to_images_invalid_format_defaults(self, client, monkeypatch):
        """Invalid format should default to png."""
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'pdf_to_images_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'format': 'bmp',
        }
        response = client.post(
            '/api/pdf-tools/pdf-to-images',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        call_args = mock_delay.call_args[0]
        assert call_args[3] == 'png'  # default format


# =========================================================================
# 6. Images to PDF — POST /api/pdf-tools/images-to-pdf
# =========================================================================
class TestImagesToPdf:
    def test_images_to_pdf_no_files(self, client):
        response = client.post('/api/pdf-tools/images-to-pdf')
        assert response.status_code == 400

    def test_images_to_pdf_success(self, client, monkeypatch):
        mock_task = MagicMock()
        mock_task.id = 'images-task-id'
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.png', 'png'),
        )
        monkeypatch.setattr(
            'app.routes.pdf_tools.images_to_pdf_task.delay',
            MagicMock(return_value=mock_task),
        )
        # Mock os.makedirs and FileStorage.save so nothing touches disk
        monkeypatch.setattr('app.routes.pdf_tools.os.makedirs', lambda *a, **kw: None)
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )
        data = {
            'files': [
                (io.BytesIO(b'\x89PNG\r\n'), 'img1.png'),
                (io.BytesIO(b'\x89PNG\r\n'), 'img2.png'),
            ]
        }
        response = client.post(
            '/api/pdf-tools/images-to-pdf',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202
        assert response.get_json()['task_id'] == 'images-task-id'

    def test_images_to_pdf_too_many(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.png', 'png'),
        )
        data = {
            'files': [
                (io.BytesIO(b'\x89PNG\r\n'), f'img{i}.png')
                for i in range(51)
            ]
        }
        response = client.post(
            '/api/pdf-tools/images-to-pdf',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert '50' in response.get_json()['error']


# =========================================================================
# 7. Watermark PDF — POST /api/pdf-tools/watermark
# =========================================================================
class TestWatermarkPdf:
    def test_watermark_no_file(self, client):
        response = client.post('/api/pdf-tools/watermark')
        assert response.status_code == 400

    def test_watermark_no_text(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'text': '',
        }
        response = client.post(
            '/api/pdf-tools/watermark',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert 'required' in response.get_json()['error'].lower()

    def test_watermark_text_too_long(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'text': 'x' * 101,
        }
        response = client.post(
            '/api/pdf-tools/watermark',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert '100' in response.get_json()['error']

    def test_watermark_success(self, client, monkeypatch):
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'watermark_pdf_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'text': 'CONFIDENTIAL',
            'opacity': '0.5',
        }
        response = client.post(
            '/api/pdf-tools/watermark',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202


# =========================================================================
# 8. Protect PDF — POST /api/pdf-tools/protect
# =========================================================================
class TestProtectPdf:
    def test_protect_no_file(self, client):
        response = client.post('/api/pdf-tools/protect')
        assert response.status_code == 400

    def test_protect_no_password(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'password': '',
        }
        response = client.post(
            '/api/pdf-tools/protect',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert 'required' in response.get_json()['error'].lower()

    def test_protect_short_password(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'password': 'abc',
        }
        response = client.post(
            '/api/pdf-tools/protect',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400
        assert '4 characters' in response.get_json()['error']

    def test_protect_success(self, client, monkeypatch):
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'protect_pdf_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'password': 'secret1234',
        }
        response = client.post(
            '/api/pdf-tools/protect',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202


# =========================================================================
# 9. Unlock PDF — POST /api/pdf-tools/unlock
# =========================================================================
class TestUnlockPdf:
    def test_unlock_no_file(self, client):
        response = client.post('/api/pdf-tools/unlock')
        assert response.status_code == 400

    def test_unlock_no_password(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.pdf_tools.validate_file',
            lambda f, allowed_types: ('test.pdf', 'pdf'),
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'password': '',
        }
        response = client.post(
            '/api/pdf-tools/unlock',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 400

    def test_unlock_success(self, client, monkeypatch):
        mock_task, mock_delay = _mock_validate_and_task(
            monkeypatch, 'app.routes.pdf_tools', 'unlock_pdf_task'
        )
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'password': 'mypassword',
        }
        response = client.post(
            '/api/pdf-tools/unlock',
            data=data,
            content_type='multipart/form-data',
        )
        assert response.status_code == 202