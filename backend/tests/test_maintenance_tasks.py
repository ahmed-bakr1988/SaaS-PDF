"""Tests for the cleanup_expired_files periodic maintenance task."""
import os
import time
import pytest
from unittest.mock import patch

from app.tasks.maintenance_tasks import _cleanup_dir


class TestCleanupDir:
    """Tests for _cleanup_dir helper."""

    def test_returns_zeros_for_missing_directory(self):
        stats = _cleanup_dir("/no/such/path", 1800)
        assert stats == {"scanned": 0, "deleted": 0, "freed_bytes": 0, "errors": 0}

    def test_skips_files_in_root(self, tmp_path):
        """Regular files in the root should be ignored (only dirs scanned)."""
        (tmp_path / "regular.txt").write_text("hello")
        stats = _cleanup_dir(str(tmp_path), 1800)
        assert stats["scanned"] == 0
        assert stats["deleted"] == 0

    def test_keeps_recent_directory(self, tmp_path):
        """Directories younger than expiry should remain untouched."""
        sub = tmp_path / "recent_job"
        sub.mkdir()
        (sub / "file.pdf").write_bytes(b"%PDF-1.4 test")
        stats = _cleanup_dir(str(tmp_path), 1800)
        assert stats["scanned"] == 1
        assert stats["deleted"] == 0
        assert sub.exists()

    def test_deletes_expired_directory(self, tmp_path):
        """Directories older than expiry should be removed."""
        sub = tmp_path / "old_job"
        sub.mkdir()
        (sub / "file.pdf").write_bytes(b"%PDF-1.4 test")
        # Set mtime to 1 hour ago
        old_time = time.time() - 3600
        os.utime(str(sub), (old_time, old_time))

        stats = _cleanup_dir(str(tmp_path), 1800)
        assert stats["scanned"] == 1
        assert stats["deleted"] == 1
        assert stats["freed_bytes"] > 0
        assert not sub.exists()

    def test_counts_freed_bytes(self, tmp_path):
        """Freed bytes should approximately match the size of deleted files."""
        sub = tmp_path / "old_job"
        sub.mkdir()
        content = b"A" * 4096
        (sub / "data.bin").write_bytes(content)
        old_time = time.time() - 3600
        os.utime(str(sub), (old_time, old_time))

        stats = _cleanup_dir(str(tmp_path), 1800)
        assert stats["freed_bytes"] >= 4096

    def test_mixed_old_and_new(self, tmp_path):
        """Only expired directories are deleted, recent ones kept."""
        old = tmp_path / "expired_dir"
        old.mkdir()
        (old / "a.txt").write_text("old")
        old_time = time.time() - 7200
        os.utime(str(old), (old_time, old_time))

        recent = tmp_path / "fresh_dir"
        recent.mkdir()
        (recent / "b.txt").write_text("new")

        stats = _cleanup_dir(str(tmp_path), 1800)
        assert stats["scanned"] == 2
        assert stats["deleted"] == 1
        assert not old.exists()
        assert recent.exists()


class TestCleanupExpiredFilesTask:
    """Integration test for the Celery task via direct invocation."""

    def test_task_runs_and_returns_stats(self, app):
        """Task should return a summary dict."""
        # Create an expired directory in uploads
        upload_dir = app.config["UPLOAD_FOLDER"]
        expired = os.path.join(upload_dir, "expired_session")
        os.makedirs(expired, exist_ok=True)
        with open(os.path.join(expired, "test.pdf"), "wb") as f:
            f.write(b"%PDF-TEST")
        old_time = time.time() - 7200
        os.utime(expired, (old_time, old_time))

        with app.app_context():
            from app.tasks.maintenance_tasks import cleanup_expired_files
            result = cleanup_expired_files()

        assert isinstance(result, dict)
        assert result["deleted"] >= 1
        assert result["freed_bytes"] > 0
        assert not os.path.exists(expired)

    def test_task_leaves_recent_alone(self, app):
        """Task should not delete recent directories."""
        upload_dir = app.config["UPLOAD_FOLDER"]
        recent = os.path.join(upload_dir, "recent_session")
        os.makedirs(recent, exist_ok=True)
        with open(os.path.join(recent, "test.pdf"), "wb") as f:
            f.write(b"%PDF-TEST")

        with app.app_context():
            from app.tasks.maintenance_tasks import cleanup_expired_files
            result = cleanup_expired_files()

        assert result["deleted"] == 0
        assert os.path.exists(recent)
