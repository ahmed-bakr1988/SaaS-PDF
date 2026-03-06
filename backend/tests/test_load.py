"""
Concurrent / load tests — verify the API handles multiple simultaneous
requests without race conditions or resource leaks.

These tests do NOT require Redis or Celery; every external call is mocked.
"""
import io
import threading
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Rapid sequential requests — baseline stability
# ---------------------------------------------------------------------------
class TestRapidSequential:
    def test_100_health_requests(self, client):
        """100 back-to-back /health requests must all return 200."""
        for _ in range(100):
            r = client.get('/api/health')
            assert r.status_code == 200

    def test_rapid_no_file_errors_are_safe(self, client):
        """50 rapid requests that each produce a 400 must not leak state."""
        for _ in range(50):
            r = client.post('/api/compress/pdf')
            assert r.status_code == 400
            assert r.get_json()['error']


# ---------------------------------------------------------------------------
# Concurrent requests — 10 simultaneous threads, each with its own client
# ---------------------------------------------------------------------------
class TestConcurrentRequests:
    def test_10_concurrent_health(self, app):
        """10 threads hitting /health simultaneously must all get 200."""
        results: list[int] = []
        errors: list[Exception] = []
        lock = threading.Lock()

        def worker():
            try:
                with app.test_client() as c:
                    r = c.get('/api/health')
                    with lock:
                        results.append(r.status_code)
            except Exception as exc:
                with lock:
                    errors.append(exc)

        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=10)

        assert not errors, f"Threads raised: {errors}"
        assert results.count(200) == 10

    def test_concurrent_compress_uploads(self, app):
        """5 concurrent compress requests each return 202 without deadlocks.
        Patches are applied ONCE outside threads to avoid thread-safety issues
        with unittest.mock's global state."""
        task_ids: list[str] = []
        errors: list[Exception] = []
        lock = threading.Lock()

        # Use a counter-based side_effect so the shared mock returns distinct ids
        counter = [0]

        def make_task():
            with lock:
                n = counter[0]
                counter[0] += 1
            t = MagicMock()
            t.id = f'task-thread-{n}'
            return t

        # Apply all patches BEFORE threads start — avoids concurrent patch/unpatch
        with patch('app.routes.compress.validate_file', return_value=('t.pdf', 'pdf')), \
             patch('app.routes.compress.generate_safe_path',
                   side_effect=lambda ext, folder_type: (f'tid-x', '/tmp/up/t.pdf')), \
             patch('werkzeug.datastructures.file_storage.FileStorage.save'), \
             patch('app.routes.compress.compress_pdf_task.delay',
                   side_effect=lambda *a, **kw: make_task()):

            def worker():
                try:
                    with app.test_client() as c:
                        r = c.post(
                            '/api/compress/pdf',
                            data={'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf')},
                            content_type='multipart/form-data',
                        )
                        with lock:
                            if r.status_code == 202:
                                task_ids.append(r.get_json()['task_id'])
                            else:
                                errors.append(
                                    AssertionError(
                                        f"expected 202, got {r.status_code}: {r.data}"
                                    )
                                )
                except Exception as exc:
                    with lock:
                        errors.append(exc)

            threads = [threading.Thread(target=worker) for _ in range(5)]
            for t in threads:
                t.start()
            for t in threads:
                t.join(timeout=15)

        assert not errors, f"Errors in threads: {errors}"
        assert len(task_ids) == 5
        assert len(set(task_ids)) == 5, "task_ids must be unique per request"

    def test_concurrent_pdf_tools_requests(self, app):
        """3 concurrent split-PDF requests must not interfere with each other.
        Patches applied once outside threads for thread safety."""
        statuses: list[int] = []
        errors: list[Exception] = []
        lock = threading.Lock()

        with patch('app.routes.pdf_tools.validate_file', return_value=('t.pdf', 'pdf')), \
             patch('app.routes.pdf_tools.generate_safe_path',
                   side_effect=lambda ext, folder_type: ('split-x', '/tmp/up/t.pdf')), \
             patch('werkzeug.datastructures.file_storage.FileStorage.save'), \
             patch('app.routes.pdf_tools.split_pdf_task.delay',
                   return_value=MagicMock(id='split-task')):

            def worker():
                try:
                    with app.test_client() as c:
                        r = c.post(
                            '/api/pdf-tools/split',
                            data={
                                'file': (io.BytesIO(b'%PDF-1.4'), 'test.pdf'),
                                'mode': 'all',
                            },
                            content_type='multipart/form-data',
                        )
                        with lock:
                            statuses.append(r.status_code)
                except Exception as exc:
                    with lock:
                        errors.append(exc)

            threads = [threading.Thread(target=worker) for _ in range(3)]
            for t in threads:
                t.start()
            for t in threads:
                t.join(timeout=15)

        assert not errors, f"Errors in threads: {errors}"
        assert all(s == 202 for s in statuses), f"Got statuses: {statuses}"


# ---------------------------------------------------------------------------
# File-size enforcement
# ---------------------------------------------------------------------------
class TestFileSizeLimits:
    def test_compress_rejects_oversized_request(self, client, app):
        """Requests exceeding MAX_CONTENT_LENGTH must be rejected (413)."""
        original = app.config['MAX_CONTENT_LENGTH']
        try:
            # Set 1-byte limit so any real file triggers it
            app.config['MAX_CONTENT_LENGTH'] = 1
            oversized = io.BytesIO(b'%PDF-1.4' + b'x' * 2048)
            r = client.post(
                '/api/compress/pdf',
                data={'file': (oversized, 'huge.pdf')},
                content_type='multipart/form-data',
            )
            assert r.status_code in (400, 413), (
                f"Expected 400 or 413 for oversized file, got {r.status_code}"
            )
        finally:
            app.config['MAX_CONTENT_LENGTH'] = original

    def test_normal_size_file_is_accepted(self, client, monkeypatch):
        """A file within the size limit reaches the route logic."""
        monkeypatch.setattr(
            'app.routes.compress.validate_file',
            lambda f, allowed_types: ('t.pdf', 'pdf'),
        )
        monkeypatch.setattr(
            'app.routes.compress.generate_safe_path',
            lambda ext, folder_type: ('tid', '/tmp/test_uploads/tid/t.pdf'),
        )
        monkeypatch.setattr(
            'werkzeug.datastructures.file_storage.FileStorage.save',
            lambda self, dst, buffer_size=16384: None,
        )
        mock_task = MagicMock()
        mock_task.id = 'size-ok-task'
        monkeypatch.setattr(
            'app.routes.compress.compress_pdf_task.delay',
            MagicMock(return_value=mock_task),
        )

        small_pdf = io.BytesIO(b'%PDF-1.4 small')
        r = client.post(
            '/api/compress/pdf',
            data={'file': (small_pdf, 'small.pdf')},
            content_type='multipart/form-data',
        )
        assert r.status_code == 202
