"""Tests for shared OpenRouter configuration resolution across AI services."""

from app.services.openrouter_config_service import (
    LEGACY_SAMPLE_OPENROUTER_API_KEY,
    extract_openrouter_text,
    get_openrouter_settings,
)
from app.services.pdf_ai_service import _call_openrouter
from app.services.site_assistant_service import _request_ai_reply


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class TestOpenRouterConfigService:
    def test_prefers_redis_model_when_set(self, app, monkeypatch):
        monkeypatch.setenv('OPENROUTER_API_KEY', 'env-key')
        monkeypatch.setenv('OPENROUTER_MODEL', 'env-model')
        monkeypatch.setenv('OPENROUTER_BASE_URL', 'https://env.example/api')
        monkeypatch.setattr(
            'app.services.openrouter_config_service.get_redis_active_model',
            lambda: 'redis-model',
        )

        with app.app_context():
            app.config.update({
                'OPENROUTER_API_KEY': 'config-key',
                'OPENROUTER_MODEL': 'config-model',
                'OPENROUTER_BASE_URL': 'https://config.example/api',
            })
            settings = get_openrouter_settings()

        assert settings.api_key == 'config-key'
        assert settings.model == 'redis-model'
        assert settings.base_url == 'https://config.example/api'

    def test_falls_back_to_environment_when_flask_config_is_blank(self, app, monkeypatch):
        monkeypatch.setenv('OPENROUTER_API_KEY', 'env-key')
        monkeypatch.setenv('OPENROUTER_MODEL', 'env-model')
        monkeypatch.setenv('OPENROUTER_BASE_URL', 'https://env.example/api')
        monkeypatch.setattr(
            'app.services.openrouter_config_service.get_redis_active_model',
            lambda: '',
        )

        with app.app_context():
            app.config.update({
                'OPENROUTER_API_KEY': '   ',
                'OPENROUTER_MODEL': '',
                'OPENROUTER_BASE_URL': '   ',
            })
            settings = get_openrouter_settings()

        assert settings.api_key == 'env-key'
        assert settings.model == 'env-model'
        assert settings.base_url == 'https://env.example/api'

    def test_falls_back_to_environment_without_app_context(self, monkeypatch):
        monkeypatch.setenv('OPENROUTER_API_KEY', 'env-key')
        monkeypatch.setenv('OPENROUTER_MODEL', 'env-model')
        monkeypatch.setenv('OPENROUTER_BASE_URL', 'https://env.example/api')
        monkeypatch.setattr(
            'app.services.openrouter_config_service.get_redis_active_model',
            lambda: '',
        )

        settings = get_openrouter_settings()

        assert settings.api_key == 'env-key'
        assert settings.model == 'env-model'
        assert settings.base_url == 'https://env.example/api'

    def test_returns_blank_api_key_when_not_configured(self, app, monkeypatch):
        monkeypatch.delenv('OPENROUTER_API_KEY', raising=False)
        monkeypatch.delenv('OPENROUTER_MODEL', raising=False)
        monkeypatch.delenv('OPENROUTER_BASE_URL', raising=False)
        monkeypatch.setattr('app.services.openrouter_config_service._load_dotenv_settings', lambda: {})
        monkeypatch.setattr(
            'app.services.openrouter_config_service.get_redis_active_model',
            lambda: '',
        )

        with app.app_context():
            app.config.update({
                'OPENROUTER_API_KEY': '   ',
                'OPENROUTER_MODEL': '',
                'OPENROUTER_BASE_URL': '',
            })
            settings = get_openrouter_settings()

        assert settings.api_key == ''
        assert settings.model
        assert settings.base_url

    def test_treats_legacy_sample_key_as_not_configured(self, app, monkeypatch):
        monkeypatch.delenv('OPENROUTER_API_KEY', raising=False)
        monkeypatch.setattr(
            'app.services.openrouter_config_service._load_dotenv_settings',
            lambda: {
                'OPENROUTER_API_KEY': LEGACY_SAMPLE_OPENROUTER_API_KEY,
            },
        )

        with app.app_context():
            app.config.update({'OPENROUTER_API_KEY': ''})
            settings = get_openrouter_settings()

        assert settings.api_key == ''

    def test_extract_openrouter_text_supports_string_and_list_content(self):
        assert extract_openrouter_text({
            'choices': [{'message': {'content': '  plain text reply  '}}],
        }) == 'plain text reply'

        assert extract_openrouter_text({
            'choices': [{
                'message': {
                    'content': [
                        {'type': 'text', 'text': 'First part'},
                        {'type': 'text', 'content': 'Second part'},
                        None,
                    ],
                },
            }],
        }) == 'First part\nSecond part'

        assert extract_openrouter_text({
            'choices': [{'message': {'content': None}}],
        }) == ''


class TestAiServicesUseSharedConfig:
    def test_pdf_ai_uses_flask_config(self, app, monkeypatch):
        captured = {}

        monkeypatch.setattr('app.services.ai_cost_service.check_ai_budget', lambda: None)
        monkeypatch.setattr('app.services.ai_cost_service.log_ai_usage', lambda **kwargs: captured.setdefault('usage', kwargs))
        monkeypatch.setattr(
            'app.services.openrouter_config_service.get_redis_active_model',
            lambda: 'config-model',
        )

        def fake_post(url, headers, json, timeout):
            captured['url'] = url
            captured['headers'] = headers
            captured['json'] = json
            captured['timeout'] = timeout
            return _FakeResponse({
                'choices': [{'message': {'content': 'Configured PDF reply'}}],
                'usage': {'prompt_tokens': 11, 'completion_tokens': 7},
            })

        monkeypatch.setattr('app.services.pdf_ai_service.requests.post', fake_post)

        with app.app_context():
            app.config.update({
                'OPENROUTER_API_KEY': 'config-key',
                'OPENROUTER_MODEL': 'config-model',
                'OPENROUTER_BASE_URL': 'https://config.example/pdf-ai',
            })
            reply = _call_openrouter('system prompt', 'user question', max_tokens=321, tool_name='pdf_chat')

        assert reply == 'Configured PDF reply'
        assert captured['url'] == 'https://config.example/pdf-ai'
        assert captured['headers']['Authorization'] == 'Bearer config-key'
        assert captured['json']['model'] == 'config-model'
        assert captured['json']['max_tokens'] == 321
        assert captured['usage']['model'] == 'config-model'

    def test_site_assistant_uses_flask_config(self, app, monkeypatch):
        captured = {}

        monkeypatch.setattr('app.services.site_assistant_service.log_ai_usage', lambda **kwargs: captured.setdefault('usage', kwargs))
        monkeypatch.setattr(
            'app.services.openrouter_config_service.get_redis_active_model',
            lambda: 'assistant-model',
        )

        def fake_post(url, headers, json, timeout):
            captured['url'] = url
            captured['headers'] = headers
            captured['json'] = json
            captured['timeout'] = timeout
            return _FakeResponse({
                'choices': [{'message': {'content': 'Configured assistant reply'}}],
                'usage': {'prompt_tokens': 13, 'completion_tokens': 9},
            })

        monkeypatch.setattr('app.services.site_assistant_service.requests.post', fake_post)

        with app.app_context():
            app.config.update({
                'OPENROUTER_API_KEY': 'assistant-key',
                'OPENROUTER_MODEL': 'assistant-model',
                'OPENROUTER_BASE_URL': 'https://config.example/assistant',
            })
            reply = _request_ai_reply(
                message='How do I merge files?',
                tool_slug='merge-pdf',
                page_url='https://example.com/tools/merge-pdf',
                locale='en',
                history=[{'role': 'assistant', 'content': 'Previous reply'}],
            )

        assert reply == 'Configured assistant reply'
        assert captured['url'] == 'https://config.example/assistant'
        assert captured['headers']['Authorization'] == 'Bearer assistant-key'
        assert captured['json']['model'] == 'assistant-model'
        assert captured['json']['messages'][-1] == {'role': 'user', 'content': 'How do I merge files?'}
        assert captured['usage']['model'] == 'assistant-model'
