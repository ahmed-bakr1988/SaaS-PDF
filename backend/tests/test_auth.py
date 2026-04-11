"""Tests for session-backed authentication routes."""

from app.services.account_service import get_user_by_oauth_account
from app.services.social_auth_service import SocialProfile


class TestAuthRoutes:
    def test_csrf_bootstrap_returns_token(self, client):
        response = client.get('/api/auth/csrf')

        assert response.status_code == 200
        assert isinstance(response.get_json()['csrf_token'], str)
        assert response.get_json()['csrf_token']

    def test_register_success(self, client):
        response = client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'secretpass123'},
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data['user']['email'] == 'user@example.com'
        assert data['user']['plan'] == 'free'
        assert data['user']['role'] == 'user'

    def test_register_assigns_admin_role_for_allowlisted_email(self, app, client):
        app.config['INTERNAL_ADMIN_EMAILS'] = ('admin@example.com',)

        response = client.post(
            '/api/auth/register',
            json={'email': 'admin@example.com', 'password': 'secretpass123'},
        )

        assert response.status_code == 201
        assert response.get_json()['user']['role'] == 'admin'

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

    def test_register_rejects_invalid_csrf_token(self, client):
        response = client.post(
            '/api/auth/register',
            json={'email': 'csrf@example.com', 'password': 'secretpass123'},
            headers={'X-CSRF-Token': 'invalid-token'},
        )

        assert response.status_code == 403
        assert 'csrf' in response.get_json()['error'].lower()

    def test_social_providers_reflect_configuration(self, app, client):
        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'X_CLIENT_ID': 'x-client',
            'X_CLIENT_SECRET': 'x-secret',
        })

        response = client.get('/api/auth/providers')

        assert response.status_code == 200
        payload = {item['id']: item for item in response.get_json()['providers']}
        assert payload['google']['available'] is True
        assert payload['facebook']['available'] is False
        assert payload['x']['available'] is True

    def test_social_x_start_uses_pkce(self, app, client):
        app.config.update({
            'X_CLIENT_ID': 'x-client',
            'X_CLIENT_SECRET': 'x-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        response = client.get('/api/auth/social/x/start')

        assert response.status_code == 302
        assert 'code_challenge_method=S256' in response.location
        with client.session_transaction() as session_state:
            flow = session_state['social_auth_flow']
        assert flow['provider'] == 'x'
        assert isinstance(flow['code_verifier'], str)
        assert len(flow['code_verifier']) >= 43

    def test_social_google_callback_creates_account_and_marks_new_session(self, app, client, monkeypatch):
        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        start_response = client.get('/api/auth/social/google/start')
        assert start_response.status_code == 302
        assert 'accounts.google.com' in start_response.location

        with client.session_transaction() as session_state:
            state = session_state['social_auth_flow']['state']

        def fake_exchange(provider, *, code, redirect_uri, code_verifier=None):
            assert provider == 'google'
            assert code == 'sample-code'
            assert redirect_uri == 'http://localhost:5000/api/auth/social/google/callback'
            assert code_verifier is None
            return SocialProfile(
                provider='google',
                provider_user_id='google-user-123',
                email='social@example.com',
                email_is_verified=True,
                display_name='Social User',
            )

        monkeypatch.setattr('app.routes.auth.exchange_code_for_profile', fake_exchange)

        callback_response = client.get(
            f'/api/auth/social/google/callback?state={state}&code=sample-code'
        )

        assert callback_response.status_code == 302
        assert callback_response.location == 'http://localhost:5173/account'

        me_response = client.get('/api/auth/me')
        me_data = me_response.get_json()
        assert me_response.status_code == 200
        assert me_data['authenticated'] is True
        assert me_data['user']['email'] == 'social@example.com'
        assert me_data['is_new_account'] is True

        second_me_data = client.get('/api/auth/me').get_json()
        assert second_me_data['is_new_account'] is False

    def test_social_callback_links_existing_account_by_email(self, app, client, monkeypatch):
        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        register_response = client.post(
            '/api/auth/register',
            json={'email': 'linked@example.com', 'password': 'secretpass123'},
        )
        original_user_id = register_response.get_json()['user']['id']
        client.post('/api/auth/logout')

        client.get('/api/auth/social/google/start')
        with client.session_transaction() as session_state:
            state = session_state['social_auth_flow']['state']

        def fake_exchange(provider, *, code, redirect_uri, code_verifier=None):
            return SocialProfile(
                provider='google',
                provider_user_id='google-linked-456',
                email='linked@example.com',
                email_is_verified=True,
                display_name='Linked User',
            )

        monkeypatch.setattr('app.routes.auth.exchange_code_for_profile', fake_exchange)

        callback_response = client.get(
            f'/api/auth/social/google/callback?state={state}&code=sample-code'
        )
        assert callback_response.status_code == 302

        me_data = client.get('/api/auth/me').get_json()
        assert me_data['authenticated'] is True
        assert me_data['user']['id'] == original_user_id
        assert me_data['is_new_account'] is False

        linked_user = get_user_by_oauth_account('google', 'google-linked-456')
        assert linked_user is not None
        assert linked_user['id'] == original_user_id

    def test_social_callback_rejects_state_mismatch(self, app, client):
        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        client.get('/api/auth/social/google/start')

        response = client.get(
            '/api/auth/social/google/callback?state=tampered-state&code=sample-code'
        )

        assert response.status_code == 302
        assert 'auth_error' in response.location
        me_data = client.get('/api/auth/me').get_json()
        assert me_data['authenticated'] is False

    def test_social_callback_rejects_unverified_email(self, app, client, monkeypatch):
        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        client.get('/api/auth/social/google/start')
        with client.session_transaction() as session_state:
            state = session_state['social_auth_flow']['state']

        def fake_exchange(provider, *, code, redirect_uri, code_verifier=None):
            return SocialProfile(
                provider='google',
                provider_user_id='google-unverified-789',
                email='unverified@example.com',
                email_is_verified=False,
            )

        monkeypatch.setattr('app.routes.auth.exchange_code_for_profile', fake_exchange)

        response = client.get(
            f'/api/auth/social/google/callback?state={state}&code=sample-code'
        )

        assert response.status_code == 302
        assert 'auth_error' in response.location
        me_data = client.get('/api/auth/me').get_json()
        assert me_data['authenticated'] is False

    def test_social_callback_rejects_no_email(self, app, client, monkeypatch):
        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        client.get('/api/auth/social/google/start')
        with client.session_transaction() as session_state:
            state = session_state['social_auth_flow']['state']

        def fake_exchange(provider, *, code, redirect_uri, code_verifier=None):
            return SocialProfile(
                provider='google',
                provider_user_id='google-noemail-000',
                email=None,
                email_is_verified=False,
            )

        monkeypatch.setattr('app.routes.auth.exchange_code_for_profile', fake_exchange)

        response = client.get(
            f'/api/auth/social/google/callback?state={state}&code=sample-code'
        )

        assert response.status_code == 302
        assert 'auth_error' in response.location
        assert client.get('/api/auth/me').get_json()['authenticated'] is False

    def test_social_callback_handles_provider_denial(self, app, client):
        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        client.get('/api/auth/social/google/start')

        response = client.get(
            '/api/auth/social/google/callback?error=access_denied&error_description=User+denied+access'
        )

        assert response.status_code == 302
        assert 'auth_error' in response.location
        assert client.get('/api/auth/me').get_json()['authenticated'] is False

    def test_social_x_callback_creates_account_with_pkce(self, app, client, monkeypatch):
        app.config.update({
            'X_CLIENT_ID': 'x-client',
            'X_CLIENT_SECRET': 'x-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        start_response = client.get('/api/auth/social/x/start')
        assert start_response.status_code == 302
        assert 'x.com' in start_response.location
        assert 'code_challenge_method=S256' in start_response.location
        assert 'users.read' in start_response.location

        with client.session_transaction() as session_state:
            state = session_state['social_auth_flow']['state']
            verifier = session_state['social_auth_flow']['code_verifier']

        def fake_exchange(provider, *, code, redirect_uri, code_verifier=None):
            assert provider == 'x'
            assert code_verifier == verifier
            return SocialProfile(
                provider='x',
                provider_user_id='x-user-001',
                email='xuser@example.com',
                email_is_verified=True,
                username='xuser_handle',
            )

        monkeypatch.setattr('app.routes.auth.exchange_code_for_profile', fake_exchange)

        callback_response = client.get(
            f'/api/auth/social/x/callback?state={state}&code=x-sample-code'
        )

        assert callback_response.status_code == 302
        me_data = client.get('/api/auth/me').get_json()
        assert me_data['authenticated'] is True
        assert me_data['user']['email'] == 'xuser@example.com'
        assert me_data['is_new_account'] is True

    def test_social_facebook_callback_creates_account(self, app, client, monkeypatch):
        app.config.update({
            'FACEBOOK_APP_ID': 'fb-app-id',
            'FACEBOOK_APP_SECRET': 'fb-app-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        start_response = client.get('/api/auth/social/facebook/start')
        assert start_response.status_code == 302
        assert 'facebook.com' in start_response.location

        with client.session_transaction() as session_state:
            state = session_state['social_auth_flow']['state']

        def fake_exchange(provider, *, code, redirect_uri, code_verifier=None):
            assert provider == 'facebook'
            assert code_verifier is None
            return SocialProfile(
                provider='facebook',
                provider_user_id='fb-user-002',
                email='fbuser@example.com',
                email_is_verified=True,
                display_name='FB User',
            )

        monkeypatch.setattr('app.routes.auth.exchange_code_for_profile', fake_exchange)

        callback_response = client.get(
            f'/api/auth/social/facebook/callback?state={state}&code=fb-sample-code'
        )

        assert callback_response.status_code == 302
        me_data = client.get('/api/auth/me').get_json()
        assert me_data['authenticated'] is True
        assert me_data['user']['email'] == 'fbuser@example.com'

    def test_link_oauth_account_rejects_cross_user_takeover(self, app, client, monkeypatch):
        """A social account already linked to user A cannot be linked to user B."""
        from app.services.account_service import create_user, link_oauth_account

        app.config.update({
            'GOOGLE_OAUTH_CLIENT_ID': 'google-client',
            'GOOGLE_OAUTH_CLIENT_SECRET': 'google-secret',
            'BACKEND_PUBLIC_URL': 'http://localhost:5000',
        })

        user_a = create_user('user_a@example.com', 'passwordA123')
        user_b = create_user('user_b@example.com', 'passwordB123')

        link_oauth_account(user_a['id'], 'google', 'shared-provider-id-999')

        import pytest
        with pytest.raises(ValueError, match='already linked to another user'):
            link_oauth_account(user_b['id'], 'google', 'shared-provider-id-999')

