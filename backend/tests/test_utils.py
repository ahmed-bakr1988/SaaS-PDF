"""Tests for general utility functions."""
from app.utils.sanitizer import generate_safe_path


def test_generate_safe_path(app):
    """generate_safe_path should produce UUID-based path."""
    with app.app_context():
        task_id, path = generate_safe_path('pdf', folder_type='upload')
        assert task_id in path
        assert path.endswith('.pdf')
        # Should contain a UUID directory
        parts = path.replace('\\', '/').split('/')
        assert len(parts) >= 3  # /tmp/test_uploads / uuid / filename.pdf


def test_generate_safe_path_unique(app):
    """Each call should produce a unique task_id."""
    with app.app_context():
        id1, _ = generate_safe_path('pdf')
        id2, _ = generate_safe_path('pdf')
        assert id1 != id2
