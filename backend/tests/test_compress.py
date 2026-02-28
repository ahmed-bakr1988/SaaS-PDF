"""Tests for PDF compression endpoint."""
import io


def test_compress_pdf_no_file(client):
    """POST /api/compress/pdf without file should return 400."""
    response = client.post('/api/compress/pdf')
    assert response.status_code == 400


def test_compress_pdf_wrong_extension(client):
    """POST /api/compress/pdf with non-PDF should return 400."""
    data = {
        'file': (io.BytesIO(b'hello'), 'test.docx'),
    }
    response = client.post(
        '/api/compress/pdf',
        data=data,
        content_type='multipart/form-data',
    )
    assert response.status_code == 400
