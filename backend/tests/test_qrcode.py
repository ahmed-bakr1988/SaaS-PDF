"""Tests for QR Code Generator endpoint — POST /api/qrcode/generate."""
import json
from unittest.mock import MagicMock


class TestQrCodeGenerator:
    def test_no_data(self, client):
        """Should return 400 when no data provided."""
        response = client.post(
            '/api/qrcode/generate',
            data=json.dumps({}),
            content_type='application/json',
        )
        assert response.status_code == 400

    def test_success_json(self, client, monkeypatch):
        """Should return 202 with task_id on valid JSON request."""
        mock_task = MagicMock()
        mock_task.id = 'qr-task-id'
        monkeypatch.setattr(
            'app.routes.qrcode.generate_qr_task',
            MagicMock(delay=MagicMock(return_value=mock_task)),
        )

        response = client.post(
            '/api/qrcode/generate',
            data=json.dumps({'data': 'https://example.com', 'size': 300}),
            content_type='application/json',
        )
        assert response.status_code == 202
        json_data = response.get_json()
        assert 'task_id' in json_data

    def test_success_form_data(self, client, monkeypatch):
        """Should return 202 with task_id on valid form-data request."""
        mock_task = MagicMock()
        mock_task.id = 'qr-form-task-id'
        monkeypatch.setattr(
            'app.routes.qrcode.generate_qr_task',
            MagicMock(delay=MagicMock(return_value=mock_task)),
        )

        response = client.post(
            '/api/qrcode/generate',
            data={'data': 'Hello World'},
            content_type='multipart/form-data',
        )
        assert response.status_code == 202

    def test_empty_data(self, client):
        """Should return 400 when data field is empty string."""
        response = client.post(
            '/api/qrcode/generate',
            data=json.dumps({'data': ''}),
            content_type='application/json',
        )
        assert response.status_code == 400
