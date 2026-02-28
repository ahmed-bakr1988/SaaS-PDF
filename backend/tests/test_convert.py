"""Tests for file conversion endpoints."""
import io


def test_pdf_to_word_no_file(client):
    """POST /api/convert/pdf-to-word without file should return 400."""
    response = client.post('/api/convert/pdf-to-word')
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data


def test_pdf_to_word_wrong_extension(client):
    """POST /api/convert/pdf-to-word with non-PDF should return 400."""
    data = {
        'file': (io.BytesIO(b'hello world'), 'test.txt'),
    }
    response = client.post(
        '/api/convert/pdf-to-word',
        data=data,
        content_type='multipart/form-data',
    )
    assert response.status_code == 400


def test_word_to_pdf_no_file(client):
    """POST /api/convert/word-to-pdf without file should return 400."""
    response = client.post('/api/convert/word-to-pdf')
    assert response.status_code == 400


def test_word_to_pdf_wrong_extension(client):
    """POST /api/convert/word-to-pdf with non-Word file should return 400."""
    data = {
        'file': (io.BytesIO(b'hello world'), 'test.pdf'),
    }
    response = client.post(
        '/api/convert/word-to-pdf',
        data=data,
        content_type='multipart/form-data',
    )
    assert response.status_code == 400
