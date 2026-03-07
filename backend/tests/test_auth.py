"""Tests for session-backed authentication routes."""


class TestAuthRoutes:
    def test_register_success(self, client):
        response = client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data['user']['email'] == 'user@example.com'
        assert data['user']['plan'] == 'free'

    def test_register_duplicate_email(self, client):
        client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )
        response = client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )

        assert response.status_code == 409
        assert 'already exists' in response.get_json()['error'].lower()

    def test_login_and_me(self, client):
        client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )
        client.post('/api/auth/logout')

        login_response = client.post(
            '/api/auth/login',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )
        me_response = client.get('/api/auth/me')

        assert login_response.status_code == 200
        assert me_response.status_code == 200
        me_data = me_response.get_json()
        assert me_data['authenticated'] is True
        assert me_data['user']['email'] == 'user@example.com'

    def test_login_invalid_password(self, client):
        client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )
        client.post('/api/auth/logout')

        response = client.post(
            '/api/auth/login',
            json={'email': 'user@example.com', 'password': 'wrongpass123'},
        )

        assert response.status_code == 401
        assert 'invalid email or password' in response.get_json()['error'].lower()

    def test_me_without_session(self, client):
        response = client.get('/api/auth/me')

        assert response.status_code == 200
        assert response.get_json() == {'authenticated': False, 'user': None}
