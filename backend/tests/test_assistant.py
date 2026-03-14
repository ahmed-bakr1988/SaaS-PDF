"""Tests for the site assistant API route."""

import json


class TestAssistantRoute:
    def test_requires_message(self, client):
        response = client.post('/api/assistant/chat', json={})
        assert response.status_code == 400
        assert response.get_json()['error'] == 'Message is required.'

    def test_success_returns_reply_and_session(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.assistant.chat_with_site_assistant',
            lambda **kwargs: {
                'session_id': kwargs['session_id'] or 'assistant-session-1',
                'reply': 'Use Merge PDF for combining files.',
                'stored': True,
            },
        )

        response = client.post(
            '/api/assistant/chat',
            json={
                'message': 'How do I combine files?',
                'fingerprint': 'visitor-1',
                'tool_slug': 'merge-pdf',
            },
        )

        assert response.status_code == 200
        body = response.get_json()
        assert body['stored'] is True
        assert body['reply'] == 'Use Merge PDF for combining files.'
        assert body['session_id']

    def test_stream_returns_sse_events(self, client, monkeypatch):
        monkeypatch.setattr(
            'app.routes.assistant.stream_site_assistant_chat',
            lambda **kwargs: iter([
                {'event': 'session', 'data': {'session_id': 'assistant-session-1'}},
                {'event': 'chunk', 'data': {'content': 'Use Merge '}},
                {'event': 'chunk', 'data': {'content': 'PDF.'}},
                {
                    'event': 'done',
                    'data': {
                        'session_id': 'assistant-session-1',
                        'reply': 'Use Merge PDF.',
                        'stored': True,
                    },
                },
            ]),
        )

        response = client.post(
            '/api/assistant/chat/stream',
            json={
                'message': 'How do I combine files?',
                'fingerprint': 'visitor-1',
                'tool_slug': 'merge-pdf',
            },
        )

        assert response.status_code == 200
        assert response.headers['Content-Type'].startswith('text/event-stream')

        body = response.get_data(as_text=True)
        assert 'event: session' in body
        assert f"data: {json.dumps({'session_id': 'assistant-session-1'})}" in body
        assert 'event: chunk' in body
        assert 'Use Merge PDF.' in body