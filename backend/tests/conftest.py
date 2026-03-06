import io
import os
import shutil
import pytest
from unittest.mock import patch, MagicMock
from app import create_app


@pytest.fixture
def app():
    """Create application for testing."""
    os.environ['FLASK_ENV'] = 'testing'
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'UPLOAD_FOLDER': '/tmp/test_uploads',
        'OUTPUT_FOLDER': '/tmp/test_outputs',
    })
    # Create temp directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

    yield app

    # Cleanup temp directories
    shutil.rmtree(app.config['UPLOAD_FOLDER'], ignore_errors=True)
    shutil.rmtree(app.config['OUTPUT_FOLDER'], ignore_errors=True)


@pytest.fixture
def client(app):
    """Flask test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Flask test CLI runner."""
    return app.test_cli_runner()


# ---------------------------------------------------------------------------
# Helpers: Create realistic test files with valid magic bytes
# ---------------------------------------------------------------------------

def make_pdf_bytes() -> bytes:
    """Create minimal valid PDF bytes for testing."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
        b"xref\n0 4\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"trailer<</Root 1 0 R/Size 4>>\n"
        b"startxref\n190\n%%EOF"
    )


def make_png_bytes() -> bytes:
    """Create minimal valid PNG bytes for testing."""
    # 1x1 white pixel PNG
    return (
        b"\x89PNG\r\n\x1a\n"  # PNG signature
        b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde"
        b"\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05"
        b"\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def make_jpeg_bytes() -> bytes:
    """Create minimal valid JPEG bytes for testing."""
    # Minimal JPEG header
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01"
        b"\x00\x01\x00\x00\xff\xd9"
    )


@pytest.fixture
def pdf_file():
    """Create a PDF file-like object for upload testing."""
    return io.BytesIO(make_pdf_bytes()), 'test.pdf'


@pytest.fixture
def png_file():
    """Create a PNG file-like object for upload testing."""
    return io.BytesIO(make_png_bytes()), 'test.png'


@pytest.fixture
def mock_celery_task():
    """Mock a Celery AsyncResult for task dispatch tests."""
    mock_task = MagicMock()
    mock_task.id = 'test-task-id-12345'
    return mock_task


@pytest.fixture
def mock_magic():
    """Mock python-magic to return expected MIME types."""
    with patch('app.utils.file_validator.magic') as mock_m:
        yield mock_m
