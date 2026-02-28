"""Tests for image conversion & resize endpoints."""
import io


def test_image_convert_no_file(client):
    """POST /api/image/convert without file should return 400."""
    response = client.post('/api/image/convert')
    assert response.status_code == 400


def test_image_resize_no_file(client):
    """POST /api/image/resize without file should return 400."""
    response = client.post('/api/image/resize')
    assert response.status_code == 400


def test_image_convert_wrong_type(client):
    """POST /api/image/convert with non-image should return 400."""
    data = {
        'file': (io.BytesIO(b'not an image'), 'test.pdf'),
    }
    response = client.post(
        '/api/image/convert',
        data=data,
        content_type='multipart/form-data',
    )
    assert response.status_code == 400
