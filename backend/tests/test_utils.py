"""Tests for text utility functions."""
import sys
import os

# Add backend to path so we can import utils directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.utils.file_validator import validate_file
from app.utils.sanitizer import generate_safe_path


def test_generate_safe_path():
    """generate_safe_path should produce UUID-based path."""
    path = generate_safe_path('uploads', 'test.pdf')
    assert path.startswith('uploads')
    assert path.endswith('.pdf')
    # Should contain a UUID directory
    parts = path.replace('\\', '/').split('/')
    assert len(parts) >= 3  # uploads / uuid / filename.pdf
