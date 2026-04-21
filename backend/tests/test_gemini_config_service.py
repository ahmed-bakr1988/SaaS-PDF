"""Tests for Gemini AI configuration and shared service behaviour."""

from app.services.gemini_client import (
    get_gemini_settings,
    extract_gemini_text,
    DEFAULT_TEXT_MODEL,
)
from app.services.pdf_ai_service import _call_openrouter
from app.services.site_assistant_service import _request_ai_reply


class TestGeminiConfigService:
    def test_prefers_redis_model_when_set(self, app, monkeypatch):
        monkeypatch.setenv('GEMINI_API_KEY', 'env-key')
        monkeypatch.setattr(
            'app.services.gemini_client._get_redis_active_model',
            lambda: 'redis-model',
        )

        with app.app_context():
            app.config.update({'GEMINI_API_KEY': 'config-key', 'GEMINI_TEXT_MODEL': 'config-model'})
            settings = get_gemini_settings()

        assert settings.api_key == 'config-key'
        assert settings.text_model == 'redis-model'

    def test_falls_back_to_env_when_flask_config_blank(self, app, monkeypatch):
        monkeypatch.setenv('GEMINI_API_KEY', 'env-key')
        monkeypatch.setenv('GEMINI_TEXT_MODEL', 'env-model')
        monkeypatch.setattr(
            'app.services.gemini_client._get_redis_active_model',
            lambda: '',
        )

        with app.app_context():
            app.config.update({'GEMINI_API_KEY': '', 'GEMINI_TEXT_MODEL': ''})
            settings = get_gemini_settings()

        assert settings.api_key == 'env-key'
        assert settings.text_model == 'env-model'

    def test_returns_blank_api_key_when_not_configured(self, app, monkeypatch):
        monkeypatch.delenv('GEMINI_API_KEY', raising=False)
        monkeypatch.delenv('GOOGLE_API_KEY', raising=False)
        monkeypatch.setattr(
            'app.services.gemini_client._get_redis_active_model',
            lambda: '',
        )

        with app.app_context():
            app.config.update({'GEMINI_API_KEY': '', 'GEMINI_TEXT_MODEL': ''})
            settings = get_gemini_settings()

        assert settings.api_key == ''
        assert settings.text_model  # should have a default

    def test_extract_gemini_text_from_candidates(self):
        payload = {
            'candidates': [
                {'content': {'parts': [{'text': '  hello world  '}]}}
            ]
        }
        assert extract_gemini_text(payload) == 'hello world'

    def test_extract_gemini_text_empty_candidates(self):
        assert extract_gemini_text({'candidates': []}) == ''

    def test_default_text_model_is_flash(self):
        assert DEFAULT_TEXT_MODEL == 'gemini-2.0-flash'


class TestAiServicesUseGemini:
    def test_pdf_ai_calls_gemini(self, app, monkeypatch):
        captured = {}

        monkeypatch.setattr('app.services.ai_cost_service.check_ai_budget', lambda: None)
        monkeypatch.setattr(
            'app.services.ai_cost_service.log_ai_usage',
            lambda **kwargs: captured.setdefault('usage', kwargs),
        )
        monkeypatch.setattr(
            'app.services.gemini_client._get_redis_active_model',
            lambda: '',
        )

        def fake_post(url, **kwargs):
            captured['url'] = url
            captured['params'] = kwargs.get('params', {})
            return type('R', (), {
                'status_code': 200,
                'raise_for_status': lambda self: None,
                'json': lambda self: {
                    'candidates': [{'content': {'parts': [{'text': 'Gemini PDF reply'}]}}],
                    'usageMetadata': {'promptTokenCount': 11, 'candidatesTokenCount': 7},
                },
            })()

        monkeypatch.setattr('app.services.gemini_client.requests.post', fake_post)

        with app.app_context():
            app.config.update({'GEMINI_API_KEY': 'test-key', 'GEMINI_TEXT_MODEL': 'gemini-2.0-flash'})
            reply = _call_openrouter('system prompt', 'user question', max_tokens=321, tool_name='pdf_chat')

        assert reply == 'Gemini PDF reply'
        assert 'generativelanguage.googleapis.com' in captured['url']

    def test_site_assistant_calls_gemini(self, app, monkeypatch):
        captured = {}

        monkeypatch.setattr(
            'app.services.site_assistant_service.log_ai_usage',
            lambda **kwargs: captured.setdefault('usage', kwargs),
        )
        monkeypatch.setattr(
            'app.services.gemini_client._get_redis_active_model',
            lambda: '',
        )

        def fake_post(url, **kwargs):
            captured['url'] = url
            return type('R', (), {
                'status_code': 200,
                'raise_for_status': lambda self: None,
                'json': lambda self: {
                    'candidates': [{'content': {'parts': [{'text': 'Gemini assistant reply'}]}}],
                    'usageMetadata': {'promptTokenCount': 13, 'candidatesTokenCount': 9},
                },
            })()

        monkeypatch.setattr('app.services.gemini_client.requests.post', fake_post)

        with app.app_context():
            app.config.update({'GEMINI_API_KEY': 'assistant-key', 'GEMINI_TEXT_MODEL': 'gemini-2.0-flash'})
            reply = _request_ai_reply(
                message='How do I merge files?',
                tool_slug='merge-pdf',
                page_url='https://example.com/tools/merge-pdf',
                locale='en',
                history=[{'role': 'assistant', 'content': 'Previous reply'}],
            )

        assert reply == 'Gemini assistant reply'
        assert 'generativelanguage.googleapis.com' in captured['url']
