import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, SendHorizontal, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { getToolSEO } from '@/config/seoData';
import { streamAssistantChat, type AssistantHistoryMessage } from '@/services/api';
import { trackEvent } from '@/services/analytics';
import { cn } from '@/utils/cn';

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
  const [isHovered, setIsHovered] = useState(false);

  const [stored] = useState(() => loadStoredState());
  const [sessionId, setSessionId] = useState(stored.sessionId);
  const [fingerprint] = useState(stored.fingerprint);
  const [messages, setMessages] = useState<AssistantMessage[]>(stored.messages);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div className="pointer-events-none fixed inset-x-4 bottom-[max(5rem,env(safe-area-inset-bottom)+4rem)] z-40 flex justify-end sm:bottom-8 sm:right-8 sm:left-auto">
      <div className="pointer-events-auto flex flex-col items-end w-full max-w-[90vw] sm:max-w-sm">
        {open && (
          <div className="mb-4 w-full overflow-hidden rounded-[32px] border border-zinc-200 bg-white/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 dark:border-zinc-800 dark:bg-zinc-950/95">
            <div className="bg-zinc-900 p-6 text-white dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight">{t('assistant.title')}</h2>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('assistant.online', 'Online')}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={t('assistant.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="max-h-[45vh] space-y-4 overflow-y-auto overscroll-contain px-5 py-6 sm:max-h-[24rem]">
              {messages.length === 0 && (
                <div className="rounded-3xl border border-zinc-100 bg-zinc-50/50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <p className="font-bold text-zinc-950 dark:text-white">
                    {toolTitle
                      ? t('assistant.greetingWithTool', { tool: toolTitle })
                      : t('assistant.greeting')}
                  </p>
                  <p className="mt-2 leading-relaxed">{t('assistant.emptyState')}</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={cn(
                      'max-w-[85%] px-4 py-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-[24px] rounded-br-lg bg-zinc-900 text-white dark:bg-brand-600'
                        : 'rounded-[24px] rounded-bl-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 bg-zinc-50/30 p-5 dark:border-zinc-800 dark:bg-zinc-950/30">
              <div className="mb-4 flex flex-wrap gap-2">
                {quickPrompts.slice(0, 2).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-600 transition-all hover:border-brand-300 hover:text-brand-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-brand-400"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2 rounded-3xl border border-zinc-200 bg-white p-2 shadow-sm ring-1 ring-zinc-100 focus-within:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-800">
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
                  className="max-h-28 min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || isSending}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/20 transition-all hover:scale-105 hover:bg-brand-700 disabled:opacity-50 disabled:grayscale"
                >
                  <SendHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative group">
          {isHovered && !open && (
            <div className="absolute bottom-full right-0 mb-4 whitespace-nowrap rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xl animate-in fade-in slide-in-from-right-4 dark:bg-white dark:text-zinc-950">
              {t('assistant.fabHover', 'Can I help you?')}
              <div className="absolute right-6 top-full h-2 w-2 -translate-y-1 rotate-45 bg-zinc-900 dark:bg-white" />
            </div>
          )}
          
          <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
              setOpen((value) => !value);
              trackEvent('assistant_toggled', { open: !open, tool: toolSlug || 'global' });
            }}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all duration-500 hover:scale-110 active:scale-95 sm:h-16 sm:w-16",
              open 
                ? "bg-zinc-900 rotate-90 dark:bg-white dark:text-zinc-950" 
                : "bg-brand-600 dark:bg-brand-500"
            )}
          >
            {open ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7 sm:h-8 sm:w-8" />}
          </button>
        </div>
      </div>
    </div>
  );
}