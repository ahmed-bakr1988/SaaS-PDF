import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Sparkles, X, Loader2 } from 'lucide-react';
import type { Flowchart, ChatMessage } from './types';
import api from '@/services/api';

interface FlowChatProps {
  flow: Flowchart;
  onClose: () => void;
  onFlowUpdate?: (updated: Flowchart) => void;
}

export default function FlowChat({ flow, onClose, onFlowUpdate }: FlowChatProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('tools.pdfFlowchart.chatWelcome', { title: flow.title }),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('/flowchart/chat', {
          message: text,
          flow_id: flow.id,
          flow_data: flow,
      });
      const data = res.data;

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.error || t('tools.pdfFlowchart.chatError'),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If the AI returned an updated flow, apply it
      if (data.updated_flow && onFlowUpdate) {
        onFlowUpdate(data.updated_flow);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('tools.pdfFlowchart.chatError'),
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    t('tools.pdfFlowchart.chatSuggestion1'),
    t('tools.pdfFlowchart.chatSuggestion2'),
    t('tools.pdfFlowchart.chatSuggestion3'),
    t('tools.pdfFlowchart.chatSuggestion4'),
  ];

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          {t('tools.pdfFlowchart.aiAssistant')}
        </h3>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                msg.role === 'assistant'
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-primary-100 text-primary-600'
              }`}
            >
              {msg.role === 'assistant' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  : 'bg-primary-500 text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="mt-1 text-[10px] opacity-50">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('tools.pdfFlowchart.chatTyping')}
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-200 px-4 py-2 dark:border-slate-700">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('tools.pdfFlowchart.chatPlaceholder')}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="btn-primary p-2"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
