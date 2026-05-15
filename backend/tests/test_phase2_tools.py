"""Tests for Phase 2 routes — PDF Conversion, PDF Extra, Image Extra, Barcode."""
import importlib
import io
import json
import os
import tempfile
from unittest.mock import patch, MagicMock

import pytest


def _barcode_available():
    """Check if python-barcode is installed."""
    try:
        import barcode  # noqa: F401
        return True
    except ImportError:
        return False


# =========================================================================
# Helpers
# =========================================================================

def _make_pdf():
    """Minimal valid PDF bytes."""
    return (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n"
        b"0000000058 00000 n \n0000000115 00000 n \n"
        b"trailer<</Root 1 0 R/Size 4>>\nstartxref\n190\n%%EOF"
    )


def _make_png():
    """Minimal valid PNG bytes."""
    return (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde"
        b"\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05"
        b"\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def _mock_route(monkeypatch, route_module, task_name, validator_name='validate_actor_file'):
    """Mock validate + generate_safe_path + celery task for a route module."""
    mock_task = MagicMock()
    mock_task.id = 'mock-task-id'
    tmp_dir = tempfile.mkdtemp()
    save_path = os.path.join(tmp_dir, 'mock_file')
    module = importlib.import_module(f'app.routes.{route_module}')

    monkeypatch.setattr(
        f'app.routes.{route_module}.validate_actor_file',
        lambda f, allowed_types, actor: ('test_file', 'pdf'),
    )
    monkeypatch.setattr(
        f'app.routes.{route_module}.generate_safe_path',
        lambda ext, folder_type: ('mock-task-id', save_path),
    )
    mock_delay = MagicMock(return_value=mock_task)
    if hasattr(module, task_name):
        monkeypatch.setattr(f'app.routes.{route_module}.{task_name}.delay', mock_delay)
    else:
        monkeypatch.setattr(f'app.routes.{route_module}.enqueue_task', mock_delay)
    return mock_task, mock_delay


# =========================================================================
# PDF Convert Routes — /api/convert
# =========================================================================

class TestPdfToPptx:
    def test_no_file(self, client):
        resp = client.post('/api/convert/pdf-to-pptx')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        _, mock_delay = _mock_route(monkeypatch, 'pdf_convert', 'pdf_to_pptx_task')
        resp = client.post('/api/convert/pdf-to-pptx', data={
            'file': (io.BytesIO(_make_pdf()), 'test.pdf'),
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        data = resp.get_json()
        assert data['task_id'] == 'mock-task-id'
        mock_delay.assert_called_once()


class TestExcelToPdf:
    def test_no_file(self, client):
        resp = client.post('/api/convert/excel-to-pdf')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        mock_task = MagicMock()
        mock_task.id = 'mock-task-id'
        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, 'mock.xlsx')

        monkeypatch.setattr(
            'app.routes.pdf_convert.validate_actor_file',
            lambda f, allowed_types, actor: ('test.xlsx', 'xlsx'),
        )
        monkeypatch.setattr(
            'app.routes.pdf_convert.generate_safe_path',
            lambda ext, folder_type: ('mock-task-id', save_path),
        )
        mock_delay = MagicMock(return_value=mock_task)
        monkeypatch.setattr('app.routes.pdf_convert.excel_to_pdf_task.delay', mock_delay)

        # Create a file with xlsx content type
        resp = client.post('/api/convert/excel-to-pdf', data={
            'file': (io.BytesIO(b'PK\x03\x04' + b'\x00' * 100), 'test.xlsx'),
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        assert resp.get_json()['task_id'] == 'mock-task-id'


class TestPptxToPdf:
    def test_no_file(self, client):
        resp = client.post('/api/convert/pptx-to-pdf')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        mock_task = MagicMock()
        mock_task.id = 'mock-task-id'
        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, 'mock.pptx')

        monkeypatch.setattr(
            'app.routes.pdf_convert.validate_actor_file',
            lambda f, allowed_types, actor: ('test.pptx', 'pptx'),
        )
        monkeypatch.setattr(
            'app.routes.pdf_convert.generate_safe_path',
            lambda ext, folder_type: ('mock-task-id', save_path),
        )
        mock_delay = MagicMock(return_value=mock_task)
        monkeypatch.setattr('app.routes.pdf_convert.pptx_to_pdf_task.delay', mock_delay)

        resp = client.post('/api/convert/pptx-to-pdf', data={
            'file': (io.BytesIO(b'PK\x03\x04' + b'\x00' * 100), 'test.pptx'),
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        assert resp.get_json()['task_id'] == 'mock-task-id'


class TestSignPdf:
    def test_no_files(self, client):
        resp = client.post('/api/convert/sign')
        assert resp.status_code == 400

    def test_missing_signature(self, client):
        resp = client.post('/api/convert/sign', data={
            'file': (io.BytesIO(_make_pdf()), 'test.pdf'),
        }, content_type='multipart/form-data')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        mock_task = MagicMock()
        mock_task.id = 'mock-task-id'
        tmp_dir = tempfile.mkdtemp()

        monkeypatch.setattr(
            'app.routes.pdf_convert.validate_actor_file',
            lambda f, allowed_types, actor: ('test.pdf', 'pdf'),
        )
        monkeypatch.setattr(
            'app.routes.pdf_convert.generate_safe_path',
            lambda ext, folder_type: ('mock-task-id', os.path.join(tmp_dir, f'mock.{ext}')),
        )
        mock_delay = MagicMock(return_value=mock_task)
        monkeypatch.setattr('app.routes.pdf_convert.sign_pdf_task.delay', mock_delay)

        resp = client.post('/api/convert/sign', data={
            'file': (io.BytesIO(_make_pdf()), 'test.pdf'),
            'signature': (io.BytesIO(_make_png()), 'sig.png'),
            'page': '1',
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        assert resp.get_json()['task_id'] == 'mock-task-id'


# =========================================================================
# PDF Extra Routes — /api/pdf-tools
# =========================================================================

class TestCropPdf:
    def test_no_file(self, client):
        resp = client.post('/api/pdf-tools/crop')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        _, mock_delay = _mock_route(monkeypatch, 'pdf_extra', 'crop_pdf_task')
        resp = client.post('/api/pdf-tools/crop', data={
            'file': (io.BytesIO(_make_pdf()), 'test.pdf'),
            'margin_left': '10', 'margin_right': '10', 'margin_top': '20', 'margin_bottom': '20',
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        assert resp.get_json()['task_id'] == 'mock-task-id'
        mock_delay.assert_called_once()


class TestFlattenPdf:
    def test_no_file(self, client):
        resp = client.post('/api/pdf-tools/flatten')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        _, mock_delay = _mock_route(monkeypatch, 'pdf_extra', 'flatten_pdf_task')
        resp = client.post('/api/pdf-tools/flatten', data={
            'file': (io.BytesIO(_make_pdf()), 'test.pdf'),
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        mock_delay.assert_called_once()


class TestRepairPdf:
    def test_no_file(self, client):
        resp = client.post('/api/pdf-tools/repair')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        _, mock_delay = _mock_route(monkeypatch, 'pdf_extra', 'repair_pdf_task')
        resp = client.post('/api/pdf-tools/repair', data={
            'file': (io.BytesIO(_make_pdf()), 'test.pdf'),
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        mock_delay.assert_called_once()


class TestEditMetadata:
    def test_no_file(self, client):
        resp = client.post('/api/pdf-tools/metadata')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        _, mock_delay = _mock_route(monkeypatch, 'pdf_extra', 'edit_metadata_task')
        resp = client.post('/api/pdf-tools/metadata', data={
            'file': (io.BytesIO(_make_pdf()), 'test.pdf'),
            'title': 'Test Title',
            'author': 'Test Author',
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        mock_delay.assert_called_once()


# =========================================================================
# Image Extra Routes — /api/image
# =========================================================================

class TestImageCrop:
    def test_no_file(self, client):
        resp = client.post('/api/image/crop')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        mock_task = MagicMock()
        mock_task.id = 'mock-task-id'
        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, 'mock.png')

        monkeypatch.setattr(
            'app.routes.image_extra.validate_actor_file',
            lambda f, allowed_types, actor: ('test.png', 'png'),
        )
        monkeypatch.setattr(
            'app.routes.image_extra.generate_safe_path',
            lambda ext, folder_type: ('mock-task-id', save_path),
        )
        mock_delay = MagicMock(return_value=mock_task)
        monkeypatch.setattr('app.routes.image_extra.crop_image_task.delay', mock_delay)

        resp = client.post('/api/image/crop', data={
            'file': (io.BytesIO(_make_png()), 'test.png'),
            'left': '0', 'top': '0', 'right': '100', 'bottom': '100',
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        assert resp.get_json()['task_id'] == 'mock-task-id'


class TestImageRotateFlip:
    def test_no_file(self, client):
        resp = client.post('/api/image/rotate-flip')
        assert resp.status_code == 400

    def test_success(self, client, monkeypatch):
        mock_task = MagicMock()
        mock_task.id = 'mock-task-id'
        tmp_dir = tempfile.mkdtemp()
        save_path = os.path.join(tmp_dir, 'mock.png')

        monkeypatch.setattr(
            'app.routes.image_extra.validate_actor_file',
            lambda f, allowed_types, actor: ('test.png', 'png'),
        )
        monkeypatch.setattr(
            'app.routes.image_extra.generate_safe_path',
            lambda ext, folder_type: ('mock-task-id', save_path),
        )
        mock_delay = MagicMock(return_value=mock_task)
        monkeypatch.setattr('app.routes.image_extra.rotate_flip_image_task.delay', mock_delay)

        resp = client.post('/api/image/rotate-flip', data={
            'file': (io.BytesIO(_make_png()), 'test.png'),
            'rotation': '90',
            'flip_horizontal': 'true',
        }, content_type='multipart/form-data')
        assert resp.status_code == 202
        assert resp.get_json()['task_id'] == 'mock-task-id'


# =========================================================================
# Barcode Routes — /api/barcode
# =========================================================================

class TestBarcodeGenerate:
    def test_no_data(self, client):
        resp = client.post('/api/barcode/generate',
                           data=json.dumps({}),
                           content_type='application/json')
        assert resp.status_code == 400

    def test_success_json(self, client, monkeypatch):
        mock_task = MagicMock()
        mock_task.id = 'mock-task-id'
        tmp_dir = tempfile.mkdtemp()

        monkeypatch.setattr(
            'app.routes.barcode.generate_safe_path',
            lambda ext, folder_type: ('mock-task-id', os.path.join(tmp_dir, 'mock.png')),
        )
        mock_delay = MagicMock(return_value=mock_task)
        monkeypatch.setattr('app.routes.barcode.generate_barcode_task.delay', mock_delay)

        resp = client.post('/api/barcode/generate',
                           data=json.dumps({'data': '12345', 'barcode_type': 'code128'}),
                           content_type='application/json')
        assert resp.status_code == 202
        assert resp.get_json()['task_id'] == 'mock-task-id'

    def test_invalid_barcode_type(self, client):
        resp = client.post('/api/barcode/generate',
                           data=json.dumps({'data': '12345', 'type': 'invalid_type'}),
                           content_type='application/json')
        assert resp.status_code == 400


# =========================================================================
# Service unit tests
# =========================================================================

class TestBarcodeService:
    @pytest.mark.skipif(
        not _barcode_available(),
        reason='python-barcode not installed'
    )
    def test_generate_barcode(self, app):
        from app.services.barcode_service import generate_barcode
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            output_path = os.path.join(tmp_dir, 'test_barcode')
            result = generate_barcode('12345678', 'code128', output_path, 'png')
            assert 'output_path' in result
            assert os.path.exists(result['output_path'])

    def test_invalid_barcode_type(self, app):
        from app.services.barcode_service import generate_barcode, BarcodeGenerationError
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            output_path = os.path.join(tmp_dir, 'test_barcode')
            with pytest.raises(BarcodeGenerationError):
                generate_barcode('12345', 'nonexistent_type', output_path, 'png')


class TestPdfExtraService:
    def test_edit_metadata(self, app):
        from app.services.pdf_extra_service import edit_pdf_metadata
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            input_path = os.path.join(tmp_dir, 'input.pdf')
            output_path = os.path.join(tmp_dir, 'output.pdf')
            with open(input_path, 'wb') as f:
                f.write(_make_pdf())
            edit_pdf_metadata(input_path, output_path, title='Test Title', author='Test Author')
            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0

    def test_flatten_pdf(self, app):
        from app.services.pdf_extra_service import flatten_pdf
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            input_path = os.path.join(tmp_dir, 'input.pdf')
            output_path = os.path.join(tmp_dir, 'output.pdf')
            with open(input_path, 'wb') as f:
                f.write(_make_pdf())
            flatten_pdf(input_path, output_path)
            assert os.path.exists(output_path)

    def test_repair_pdf(self, app):
        from app.services.pdf_extra_service import repair_pdf
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            input_path = os.path.join(tmp_dir, 'input.pdf')
            output_path = os.path.join(tmp_dir, 'output.pdf')
            with open(input_path, 'wb') as f:
                f.write(_make_pdf())
            repair_pdf(input_path, output_path)
            assert os.path.exists(output_path)

    def test_crop_pdf(self, app):
        from app.services.pdf_extra_service import crop_pdf
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            input_path = os.path.join(tmp_dir, 'input.pdf')
            output_path = os.path.join(tmp_dir, 'output.pdf')
            with open(input_path, 'wb') as f:
                f.write(_make_pdf())
            crop_pdf(input_path, output_path, margin_left=10, margin_right=10, margin_top=10, margin_bottom=10)
            assert os.path.exists(output_path)


class TestImageExtraService:
    def test_rotate_flip(self, app):
        from app.services.image_extra_service import rotate_flip_image
        from PIL import Image
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            input_path = os.path.join(tmp_dir, 'input.png')
            output_path = os.path.join(tmp_dir, 'output.png')
            img = Image.new('RGB', (100, 100), color='red')
            img.save(input_path)
            rotate_flip_image(input_path, output_path, rotation=90)
            assert os.path.exists(output_path)
            result = Image.open(output_path)
            assert result.size == (100, 100)

    def test_crop_image(self, app):
        from app.services.image_extra_service import crop_image
        from PIL import Image
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            input_path = os.path.join(tmp_dir, 'input.png')
            output_path = os.path.join(tmp_dir, 'output.png')
            img = Image.new('RGB', (200, 200), color='blue')
            img.save(input_path)
            crop_image(input_path, output_path, left=10, top=10, right=100, bottom=100)
            assert os.path.exists(output_path)
            result = Image.open(output_path)
            assert result.size == (90, 90)

    def test_crop_invalid_coords(self, app):
        from app.services.image_extra_service import crop_image, ImageExtraError
        from PIL import Image
        with app.app_context():
            tmp_dir = tempfile.mkdtemp()
            input_path = os.path.join(tmp_dir, 'input.png')
            output_path = os.path.join(tmp_dir, 'output.png')
            img = Image.new('RGB', (100, 100), color='blue')
            img.save(input_path)
            with __import__('pytest').raises(ImageExtraError):
                crop_image(input_path, output_path, left=100, top=0, right=50, bottom=100)
