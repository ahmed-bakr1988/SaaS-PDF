import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, SendHorizontal, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { getToolSEO } from '@/config/seoData';
import { streamAssistantChat, type AssistantHistoryMessage } from '@/services/api';
import { trackEvent } from '@/services/analytics';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface AssistantStorageState {
  sessionId: string;
  fingerprint: string;
  messages: AssistantMessage[];
}

const STORAGE_KEY = 'dociva:site-assistant:v1';
const MAX_STORED_MESSAGES = 20;
const ASSISTANT_ENABLED = import.meta.env.VITE_SITE_ASSISTANT_ENABLED !== 'false';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadStoredState(): AssistantStorageState {
  if (typeof window === 'undefined') {
    return {
      sessionId: createId('assistant-session'),
      fingerprint: createId('assistant-visitor'),
      messages: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        sessionId: createId('assistant-session'),
        fingerprint: createId('assistant-visitor'),
        messages: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<AssistantStorageState>;
    return {
      sessionId: parsed.sessionId || createId('assistant-session'),
      fingerprint: parsed.fingerprint || createId('assistant-visitor'),
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_STORED_MESSAGES) : [],
    };
  } catch {
    return {
      sessionId: createId('assistant-session'),
      fingerprint: createId('assistant-visitor'),
      messages: [],
    };
  }
}

export default function SiteAssistant() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [storedState] = useState<AssistantStorageState>(() => loadStoredState());
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(storedState.sessionId);
  const [fingerprint] = useState(storedState.fingerprint);
  const [messages, setMessages] = useState<AssistantMessage[]>(storedState.messages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const toolSlug = location.pathname.startsWith('/tools/')
    ? location.pathname.replace('/tools/', '').split('/')[0]
    : '';
  const toolSEO = toolSlug ? getToolSEO(toolSlug) : undefined;
  const toolTitle = toolSEO ? t(`tools.${toolSEO.i18nKey}.title`) : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId,
        fingerprint,
        messages: messages.slice(-MAX_STORED_MESSAGES),
      })
    );
  }, [fingerprint, messages, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  if (!ASSISTANT_ENABLED) {
    return null;
  }

  const quickPrompts = toolSEO
    ? [
        t('assistant.prompts.currentTool', { tool: toolTitle }),
        t('assistant.prompts.alternativeTool'),
        t('assistant.prompts.share'),
      ]
    : [
        t('assistant.prompts.findTool'),
        t('assistant.prompts.pdfWorkflows'),
        t('assistant.prompts.imageWorkflows'),
      ];

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const userMessage: AssistantMessage = {
      id: createId('assistant-message'),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage].slice(-MAX_STORED_MESSAGES);
    const assistantMessageId = createId('assistant-message');
    const assistantPlaceholder: AssistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    const history: AssistantHistoryMessage[] = nextMessages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages([
      ...nextMessages,
      assistantPlaceholder,
    ].slice(-MAX_STORED_MESSAGES));
    setInput('');
    setError(null);
    setIsSending(true);
    trackEvent('assistant_message_sent', { tool: toolSlug || 'global' });

    try {
      const response = await streamAssistantChat({
        message: trimmed,
        session_id: sessionId,
        fingerprint,
        tool_slug: toolSlug,
        page_url: typeof window !== 'undefined' ? window.location.href : location.pathname,
        locale: i18n.language,
        history,
      }, {
        onSession: (nextSessionId) => {
          setSessionId(nextSessionId);
        },
        onChunk: (chunk) => {
          setMessages((currentMessages) => currentMessages.map((message) => (
            message.id === assistantMessageId
              ? { ...message, content: `${message.content}${chunk}` }
              : message
          )));
        },
      });

      setSessionId(response.session_id);
      setMessages((currentMessages) => currentMessages.map((message) => (
        message.id === assistantMessageId
          ? { ...message, content: response.reply }
          : message
      )));
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : t('assistant.unavailable');
      setError(message);
      toast.error(message);

      setMessages((currentMessages) => currentMessages.map((currentMessage) => (
        currentMessage.id === assistantMessageId
          ? { ...currentMessage, content: t('assistant.unavailable') }
          : currentMessage
      )));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-end sm:bottom-6 sm:right-6 sm:left-auto">
      <div className="pointer-events-auto w-full max-w-sm">
        {open && (
          <div className="mb-3 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_20px_80px_rgba(15,23,42,0.16)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/95">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_40%),linear-gradient(135deg,rgba(15,23,42,1),rgba(30,41,59,0.96))] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('assistant.badge')}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{t('assistant.title')}</h2>
                  <p className="mt-1 text-sm text-slate-200">{t('assistant.subtitle')}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-white/10 p-2 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label={t('assistant.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-xs text-slate-100">
                {t('assistant.dataNotice')}
              </p>
            </div>

            <div ref={scrollRef} className="max-h-[50dvh] space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:max-h-[26rem]">
              {messages.length === 0 && (
                <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-slate-700 dark:border-sky-900/50 dark:bg-slate-900 dark:text-slate-200">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {toolTitle
                      ? t('assistant.greetingWithTool', { tool: toolTitle })
                      : t('assistant.greeting')}
                  </p>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">{t('assistant.emptyState')}</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={message.role === 'user'
                      ? 'max-w-[85%] rounded-[24px] rounded-br-md bg-slate-900 px-4 py-3 text-sm text-white dark:bg-sky-500'
                      : 'max-w-[85%] rounded-[24px] rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200'}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-[24px] rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {t('assistant.thinking')}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
              {error && (
                <p className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  {error}
                </p>
              )}

              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-sky-200 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-800 dark:hover:text-sky-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  placeholder={t('assistant.inputPlaceholder')}
                  rows={1}
                  className="max-h-28 min-h-[2.75rem] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || isSending}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                  aria-label={t('assistant.send')}
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            trackEvent('assistant_toggled', { open: !open, tool: toolSlug || 'global' });
          }}
          className="ml-auto flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#0f172a,#0369a1)] px-5 py-3 text-left text-white shadow-[0_18px_48px_rgba(2,132,199,0.35)] transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <Bot className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{t('assistant.fabTitle')}</span>
            <span className="block text-xs text-sky-100">{t('assistant.fabSubtitle')}</span>
          </span>
        </button>
      </div>
    </div>
  );
}