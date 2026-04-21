"""Tests for site assistant persistence and fallback behavior."""
import json
import sqlite3

from app.services.site_assistant_service import chat_with_site_assistant, stream_site_assistant_chat


class TestSiteAssistantService:
    def test_chat_persists_conversation_and_messages(self, app, monkeypatch):
        with app.app_context():
            monkeypatch.setattr(
                'app.services.site_assistant_service._request_ai_reply',
                lambda **kwargs: 'Use Merge PDF if you want one combined document.',
            )

            result = chat_with_site_assistant(
                message='How can I combine PDF files?',
                session_id='assistant-session-123',
                fingerprint='visitor-123',
                tool_slug='merge-pdf',
                page_url='https://example.com/tools/merge-pdf',
                locale='en',
                user_id=None,
                history=[{'role': 'user', 'content': 'Hello'}],
            )

            assert result['stored'] is True
            assert result['session_id'] == 'assistant-session-123'
            assert 'Merge PDF' in result['reply']

            connection = sqlite3.connect(app.config['DATABASE_PATH'])
            connection.row_factory = sqlite3.Row

            conversation = connection.execute(
                'SELECT session_id, fingerprint, tool_slug, locale FROM assistant_conversations WHERE session_id = ?',
                ('assistant-session-123',),
            ).fetchone()
            messages = connection.execute(
                'SELECT role, content FROM assistant_messages ORDER BY id ASC'
            ).fetchall()

            assert conversation['fingerprint'] == 'visitor-123'
            assert conversation['tool_slug'] == 'merge-pdf'
            assert conversation['locale'] == 'en'
            assert [row['role'] for row in messages] == ['user', 'assistant']
            assert 'How can I combine PDF files?' in messages[0]['content']
            assert 'Merge PDF' in messages[1]['content']

    def test_stream_chat_persists_streamed_reply(self, app, monkeypatch):
        class FakeStreamResponse:
            status_code = 200

            def raise_for_status(self):
                return None

            def iter_lines(self, decode_unicode=True):
                yield 'data: ' + json.dumps({
                    'candidates': [{'content': {'parts': [{'text': 'Use Merge PDF for this.'}]}}],
                })

            def close(self):
                return None

        with app.app_context():
            monkeypatch.setattr(
                'app.services.site_assistant_service.check_ai_budget',
                lambda: None,
            )
            monkeypatch.setattr(
                'app.services.gemini_client.requests.post',
                lambda *args, **kwargs: FakeStreamResponse(),
            )
            app.config.update({
                'GEMINI_API_KEY': 'config-key',
                'GEMINI_TEXT_MODEL': 'gemini-test-model',
            })

            events = list(stream_site_assistant_chat(
                message='How can I combine PDF files?',
                session_id='assistant-stream-123',
                fingerprint='visitor-123',
                tool_slug='merge-pdf',
                page_url='https://example.com/tools/merge-pdf',
                locale='en',
                user_id=None,
                history=[{'role': 'assistant', 'content': 'Hello'}],
            ))

            assert events[0]['event'] == 'session'
            assert events[1]['event'] == 'chunk'
            assert events[-1]['event'] == 'done'
            assert events[-1]['data']['reply'] == 'Use Merge PDF for this.'

            connection = sqlite3.connect(app.config['DATABASE_PATH'])
            connection.row_factory = sqlite3.Row
            messages = connection.execute(
                'SELECT role, content, metadata_json FROM assistant_messages ORDER BY id ASC'
            ).fetchall()

            assert [row['role'] for row in messages] == ['user', 'assistant']
            assert messages[1]['content'] == 'Use Merge PDF for this.'
            assert 'gemini-test-model' in messages[1]['metadata_json']