"""Tests for PDF tools Celery task routes — ensures frontend→backend request formats work."""
import io
from unittest.mock import MagicMock


class TestPdfToolsTaskRoutes:
    """
    These tests verify that the backend route accepts the exact request format
    the frontend sends, processes parameters correctly, and dispatches the
    appropriate Celery task.
    """

    def test_split_dispatches_task(self, client, monkeypatch):
        """Split route should dispatch split_pdf_task with correct params."""
        mock_task = MagicMock()
        mock_task.id = 'split-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('split-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.split_pdf_task.delay', mock_delay)

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'mode': 'range',
            'pages': '1-5',
        }
        response = client.post('/api/pdf-tools/split', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        # Verify task was called with (input_path, task_id, filename, mode, pages)
        args = mock_delay.call_args[0]
        assert args[3] == 'range'
        assert args[4] == '1-5'

    def test_rotate_dispatches_task(self, client, monkeypatch):
        """Rotate route should dispatch with rotation and pages params."""
        mock_task = MagicMock()
        mock_task.id = 'rotate-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('rotate-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.rotate_pdf_task.delay', mock_delay)

        # Frontend sends: rotation=90, pages=all
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'rotation': '180',
            'pages': 'all',
        }
        response = client.post('/api/pdf-tools/rotate', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        args = mock_delay.call_args[0]
        assert args[3] == 180  # rotation as int
        assert args[4] == 'all'

    def test_watermark_dispatches_task(self, client, monkeypatch):
        """Watermark route should dispatch with text and opacity."""
        mock_task = MagicMock()
        mock_task.id = 'wm-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('wm-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.watermark_pdf_task.delay', mock_delay)

        # Frontend sends: text and opacity (as decimal string)
        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'text': 'CONFIDENTIAL',
            'opacity': '0.3',
        }
        response = client.post('/api/pdf-tools/watermark', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        args = mock_delay.call_args[0]
        assert args[3] == 'CONFIDENTIAL'
        assert args[4] == 0.3

    def test_remove_watermark_dispatches_task(self, client, monkeypatch):
        """Remove watermark route should dispatch the correct Celery task."""
        mock_task = MagicMock()
        mock_task.id = 'remove-wm-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('remove-wm-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.remove_watermark_task.delay', mock_delay)

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
        }
        response = client.post('/api/pdf-tools/remove-watermark', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        args = mock_delay.call_args[0]
        assert args[0] == '/tmp/test.pdf'
        assert args[1] == 'remove-wm-id'
        assert args[2] == 'test.pdf'

    def test_reorder_dispatches_task(self, client, monkeypatch):
        """Reorder route should dispatch with the parsed page order list."""
        mock_task = MagicMock()
        mock_task.id = 'reorder-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('reorder-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.reorder_pdf_task.delay', mock_delay)

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'page_order': '3,1,2',
        }
        response = client.post('/api/pdf-tools/reorder', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        args = mock_delay.call_args[0]
        assert args[0] == '/tmp/test.pdf'
        assert args[1] == 'reorder-id'
        assert args[2] == 'test.pdf'
        assert args[3] == [3, 1, 2]

    def test_protect_dispatches_task(self, client, monkeypatch):
        """Protect route should dispatch with password."""
        mock_task = MagicMock()
        mock_task.id = 'protect-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('protect-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.protect_pdf_task.delay', mock_delay)

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'password': 'mySecret123',
        }
        response = client.post('/api/pdf-tools/protect', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        args = mock_delay.call_args[0]
        assert args[3] == 'mySecret123'

    def test_unlock_dispatches_task(self, client, monkeypatch):
        """Unlock route should dispatch with password."""
        mock_task = MagicMock()
        mock_task.id = 'unlock-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('unlock-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.unlock_pdf_task.delay', mock_delay)

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'password': 'oldPassword',
        }
        response = client.post('/api/pdf-tools/unlock', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202

    def test_page_numbers_dispatches_task(self, client, monkeypatch):
        """Page numbers route should dispatch with position and start_number."""
        mock_task = MagicMock()
        mock_task.id = 'pn-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('pn-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.add_page_numbers_task.delay', mock_delay)

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'position': 'top-right',
            'start_number': '5',
        }
        response = client.post('/api/pdf-tools/page-numbers', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        args = mock_delay.call_args[0]
        assert args[3] == 'top-right'
        assert args[4] == 5

    def test_pdf_to_images_dispatches_task(self, client, monkeypatch):
        """PDF to images route should dispatch with format and dpi."""
        mock_task = MagicMock()
        mock_task.id = 'p2i-id'
        mock_delay = MagicMock(return_value=mock_task)

        monkeypatch.setattr('app.routes.pdf_tools.validate_actor_file',
                            lambda f, allowed_types, actor: ('test.pdf', 'pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.generate_safe_path',
                            lambda ext, folder_type: ('p2i-id', '/tmp/test.pdf'))
        monkeypatch.setattr('app.routes.pdf_tools.pdf_to_images_task.delay', mock_delay)

        data = {
            'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
            'format': 'jpg',
            'dpi': '300',
        }
        response = client.post('/api/pdf-tools/pdf-to-images', data=data,
                               content_type='multipart/form-data')
        assert response.status_code == 202
        args = mock_delay.call_args[0]
        assert args[3] == 'jpg'
        assert args[4] == 300