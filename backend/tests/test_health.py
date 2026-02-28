"""Tests for health check and app creation."""


def test_health_endpoint(client):
    """GET /api/health should return 200."""
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'


def test_app_creates(app):
    """App should create without errors."""
    assert app is not None
    assert app.config['TESTING'] is True
