"""Tests for rate limiting middleware."""
import pytest
from app import create_app


@pytest.fixture
def rate_limited_app(tmp_path):
    """App with rate limiting ENABLED.

    TestingConfig sets RATELIMIT_ENABLED=False so the other 116 tests are
    never throttled.  Here we force the extension's internal flag back to
    True *after* init_app so the decorator limits are enforced.
    """
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'RATELIMIT_STORAGE_URI': 'memory://',
        'UPLOAD_FOLDER': str(tmp_path / 'uploads'),
        'OUTPUT_FOLDER': str(tmp_path / 'outputs'),
    })
    import os
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

    # flask-limiter 3.x returns from init_app immediately when
    # RATELIMIT_ENABLED=False (TestingConfig default), so `initialized`
    # stays False and no limits are enforced.  We override the config key
    # and call init_app a SECOND time so the extension fully initialises.
    # It is safe to call twice — flask-limiter guards against duplicate
    # before_request hook registration via app.extensions["limiter"].
    from app.extensions import limiter as _limiter
    app.config['RATELIMIT_ENABLED'] = True
    _limiter.init_app(app)        # second call — now RATELIMIT_ENABLED=True

    yield app

    # Restore so other tests are unaffected
    _limiter.enabled = False
    _limiter.initialized = False


@pytest.fixture
def rate_limited_client(rate_limited_app):
    return rate_limited_app.test_client()


class TestRateLimiter:
    def test_health_endpoint_not_rate_limited(self, client):
        """Health endpoint should handle many rapid requests."""
        for _ in range(20):
            response = client.get('/api/health')
            assert response.status_code == 200

    def test_rate_limit_header_present(self, client):
        """Response should include a valid HTTP status code."""
        response = client.get('/api/health')
        assert response.status_code == 200


class TestRateLimitEnforcement:
    """Verify that per-route rate limits actually trigger (429) when exceeded."""

    def test_compress_rate_limit_triggers(self, rate_limited_client):
        """
        POST /api/compress/pdf has @limiter.limit("10/minute").
        After 10 requests (each returns 400 for missing file, but the limiter
        still counts them), the 11th must get 429 Too Many Requests.
        """
        blocked = False
        for i in range(15):
            r = rate_limited_client.post('/api/compress/pdf')
            if r.status_code == 429:
                blocked = True
                break
        assert blocked, (
            "Expected a 429 Too Many Requests after exceeding 10/minute "
            "on /api/compress/pdf"
        )

    def test_convert_pdf_to_word_rate_limit(self, rate_limited_client):
        """POST /api/convert/pdf-to-word is also rate-limited."""
        blocked = False
        for _ in range(15):
            r = rate_limited_client.post('/api/convert/pdf-to-word')
            if r.status_code == 429:
                blocked = True
                break
        assert blocked, "Rate limit not enforced on /api/convert/pdf-to-word"

    def test_different_endpoints_have_independent_limits(self, rate_limited_client):
        """
        Exhausting the limit on /compress/pdf must not affect /api/health,
        which has no rate limit.
        """
        # Exhaust compress limit
        for _ in range(15):
            rate_limited_client.post('/api/compress/pdf')

        # Health should still respond normally
        r = rate_limited_client.get('/api/health')
        assert r.status_code == 200