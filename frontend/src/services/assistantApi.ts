import api from './apiClient';
import { ensureCsrfToken, isCsrfFailure, setRequestHeader } from './apiClient';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
} from './apiTypes';

const CSRF_HEADER_NAME = 'X-CSRF-Token';

interface AssistantStreamHandlers {
  onSession?: (sessionId: string) => void;
  onChunk?: (chunk: string) => void;
}

interface AssistantStreamEvent {
  event: string;
  data: Record<string, unknown>;
}


async function postAssistantStream(
  payload: AssistantChatRequest,
  csrfToken: string
): Promise<Response> {
  const streamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  if (csrfToken) {
    streamHeaders[CSRF_HEADER_NAME] = csrfToken;
  }

  return fetch('/api/assistant/chat/stream', {
    method: 'POST',
    credentials: 'include',
    headers: streamHeaders,
    body: JSON.stringify(payload),
  });
}


function parseAssistantStreamEvent(rawEvent: string): AssistantStreamEvent | null {
  const lines = rawEvent.split(/\r?\n/);
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    event,
    data: JSON.parse(dataLines.join('\n')) as Record<string, unknown>,
  };
}


function normalizeStreamError(status: number, bodyText: string): Error {
  if (!bodyText.trim()) {
    return new Error(`Request failed (${status}).`);
  }

  try {
    const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
    return new Error(parsed.error || parsed.message || `Request failed (${status}).`);
  } catch {
    return new Error(bodyText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  }
}

/**
 * Send one message to the site assistant.
 */
export async function chatWithAssistant(
  payload: AssistantChatRequest
): Promise<AssistantChatResponse> {
  const response = await api.post<AssistantChatResponse>('/assistant/chat', payload);
  return response.data;
}


/**
 * Stream one assistant response incrementally over SSE.
 */
export async function streamAssistantChat(
  payload: AssistantChatRequest,
  handlers: AssistantStreamHandlers = {}
): Promise<AssistantChatResponse> {
  let response = await postAssistantStream(payload, await ensureCsrfToken());

  if (!response.ok) {
    let bodyText = await response.text();

    if (isCsrfFailure(response.status, bodyText)) {
      response = await postAssistantStream(payload, await ensureCsrfToken(true));
      if (!response.ok) {
        bodyText = await response.text();
        throw normalizeStreamError(response.status, bodyText);
      }
    } else {
      throw normalizeStreamError(response.status, bodyText);
    }
  }

  if (!response.body) {
    throw new Error('Streaming is not supported by this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: AssistantChatResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsedEvent = parseAssistantStreamEvent(rawEvent);

      if (parsedEvent?.event === 'session') {
        const sessionId = parsedEvent.data.session_id;
        if (typeof sessionId === 'string') {
          handlers.onSession?.(sessionId);
        }
      }

      if (parsedEvent?.event === 'chunk') {
        const chunk = parsedEvent.data.content;
        if (typeof chunk === 'string' && chunk) {
          handlers.onChunk?.(chunk);
        }
      }

      if (parsedEvent?.event === 'done') {
        const sessionId = parsedEvent.data.session_id;
        const reply = parsedEvent.data.reply;
        const stored = parsedEvent.data.stored;
        if (
          typeof sessionId === 'string' &&
          typeof reply === 'string' &&
          typeof stored === 'boolean'
        ) {
          finalResponse = {
            session_id: sessionId,
            reply,
            stored,
          };
        }
      }

      if (parsedEvent?.event === 'error') {
        const errorMessage =
          typeof parsedEvent.data.error === 'string'
            ? parsedEvent.data.error
            : 'Unknown streaming error.';
        throw new Error(errorMessage);
      }

      boundary = buffer.indexOf('\n\n');
    }

    if (done) {
      break;
    }
  }

  if (!finalResponse) {
    throw new Error('Assistant stream ended unexpectedly.');
  }

  return finalResponse;
}
