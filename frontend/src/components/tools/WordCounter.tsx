import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCheck,
  Copy,
  Download,
  FileSearch,
  Goal,
  Instagram,
  Linkedin,
  LoaderCircle,
  RefreshCcw,
  ScanSearch,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { chatWithAssistant } from '@/services/api';
import type { SocialTextAnalysisResponse } from '@/services/apiTypes';
import { analyzeSocialText } from '@/services/socialTextApi';

const SAMPLE_POSTS = [
  `Launching our new creator analytics dashboard today. Track engagement, save time, and spot your best-performing hooks faster. Try the demo and tell us what metric you want next. #analytics #saas`,
  `نطلق اليوم لوحة تحليلات جديدة لصناع المحتوى. راقب التفاعل، اختصر وقت المراجعة، واعرف أي منشور يجذب جمهورك أسرع. جرّب النسخة التجريبية وشاركنا الميزة التي تريدها بعد ذلك. #صناعة_المحتوى #تحليلات`,
];

const PLATFORM_LIMITS = [
  { id: 'instagram', label: 'Instagram', limit: 150 },
  { id: 'facebook', label: 'Facebook', limit: 250 },
  { id: 'x', label: 'X', limit: 280 },
  { id: 'linkedin', label: 'LinkedIn', limit: 300 },
] as const;

const LOCAL_DRAFT_KEY = 'dociva-word-counter-draft';
const LOCAL_GOAL_KEY = 'dociva-word-counter-goal';

const USE_CASE_PRESETS = [
  { id: 'ad', label: 'Ad copy', text: 'Write a short high-converting paid ad caption with a clear CTA, one benefit, and one proof point.' },
  { id: 'caption', label: 'Social caption', text: 'Draft a concise social caption with a natural hook, one value point, and a final CTA.' },
  { id: 'email', label: 'Email intro', text: 'Write a short product update email opening that sounds clear, confident, and human.' },
] as const;

type AssistantActionKey = 'paraphrase' | 'grammar' | 'detectAi' | 'plagiarism';

interface AssistantActionState {
  action: AssistantActionKey;
  content: string;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatReadingTime(seconds: number, t: (key: string, options?: Record<string, unknown>) => string) {
  if (seconds < 60) {
    return t('tools.wordCounter.readingTimeSeconds', { count: seconds });
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return t('tools.wordCounter.readingTimeMinutes', { count: minutes });
  }

  return `${t('tools.wordCounter.readingTimeMinutes', { count: minutes })} ${t('tools.wordCounter.readingTimeSeconds', { count: remainingSeconds })}`;
}

function getGaugeState(score: number) {
  if (score >= 80) {
    return {
      labelKey: 'tools.wordCounter.risk.high',
      messageKey: 'tools.wordCounter.risk.highMessage',
      color: '#ff666f',
      track: '#ffe4e6',
    };
  }

  if (score >= 60) {
    return {
      labelKey: 'tools.wordCounter.risk.medium',
      messageKey: 'tools.wordCounter.risk.mediumMessage',
      color: '#f59e0b',
      track: '#fef3c7',
    };
  }

  return {
    labelKey: 'tools.wordCounter.risk.low',
    messageKey: 'tools.wordCounter.risk.lowMessage',
    color: '#10b981',
    track: '#dcfce7',
  };
}

function InstagramGlyph() {
  return <Instagram className="h-5 w-5" />;
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.6-1.6H16V4.8c-.4-.1-1.3-.2-2.5-.2-2.5 0-4.1 1.5-4.1 4.4V11H7v3h2.4v7h4.1Z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" aria-hidden="true">
      <path d="M18.9 3H21l-4.6 5.2L21.8 21h-4.9l-3.8-5-4.4 5H6.6l4.9-5.6L2.2 3h5l3.5 4.7L18.9 3Zm-1.7 16h1.4L6.5 4.9H5.1L17.2 19Z" />
    </svg>
  );
}

function LinkedInGlyph() {
  return <Linkedin className="h-5 w-5" />;
}

function GaugeCard({
  score,
  message,
  label,
  color,
  track,
}: {
  score: number;
  message: string;
  label: string;
  color: string;
  track: string;
}) {
  const radius = 62;
  const circumference = Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (circumference * progress) / 100;

  return (
    <div className="rounded-[20px] border border-[#f4dddd] bg-[#fff7f7] px-4 py-3.5">
      <div className="grid items-center gap-3 sm:grid-cols-[160px_1fr]">
        <div className="relative mx-auto flex h-[82px] w-[146px] items-center justify-center">
          <svg viewBox="0 0 160 96" className="h-[82px] w-[136px]">
            <path
              d="M 18 78 A 62 62 0 0 1 142 78"
              fill="none"
              stroke={track}
              strokeWidth="18"
              strokeLinecap="round"
            />
            <path
              d="M 18 78 A 62 62 0 0 1 142 78"
              fill="none"
              stroke={color}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute bottom-2 text-center">
            <div className="text-[28px] font-bold leading-none text-slate-900">{label}</div>
          </div>
        </div>

        <p className="max-w-[290px] text-sm leading-5 text-slate-700">{message}</p>
      </div>
    </div>
  );
}

export default function WordCounter() {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('');
  const [goal, setGoal] = useState(280);
  const [analysis, setAnalysis] = useState<SocialTextAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantResult, setAssistantResult] = useState<AssistantActionState | null>(null);
  const [assistantLoading, setAssistantLoading] = useState<AssistantActionKey | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantSessionId, setAssistantSessionId] = useState<string | null>(null);
  const [assistantFingerprint] = useState(() => createId('word-counter-assistant'));
  const [restoredDraft, setRestoredDraft] = useState(false);
  const deferredText = useDeferredValue(text);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(LOCAL_DRAFT_KEY);
      const savedGoal = localStorage.getItem(LOCAL_GOAL_KEY);
      if (savedDraft) {
        setText(savedDraft);
        setRestoredDraft(true);
      }
      if (savedGoal) {
        const parsedGoal = Number(savedGoal);
        if (Number.isFinite(parsedGoal) && parsedGoal > 0) {
          setGoal(parsedGoal);
        }
      }
    } catch {
      // Ignore draft restore issues.
    }
  }, []);

  useEffect(() => {
    try {
      if (text.trim()) {
        localStorage.setItem(LOCAL_DRAFT_KEY, text);
      } else {
        localStorage.removeItem(LOCAL_DRAFT_KEY);
      }
    } catch {
      // Ignore draft persistence issues.
    }
  }, [text]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_GOAL_KEY, String(goal));
    } catch {
      // Ignore goal persistence issues.
    }
  }, [goal]);

  useEffect(() => {
    const trimmed = deferredText.trim();
    if (!trimmed) {
      startTransition(() => {
        setAnalysis(null);
        setError(null);
        setIsLoading(false);
      });
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await analyzeSocialText(trimmed);
        startTransition(() => {
          setAnalysis(result);
        });
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : t('common.errors.serverError');
        startTransition(() => {
          setError(message);
          setAnalysis(null);
        });
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [deferredText, t]);

  const score = analysis?.overall_score ?? 0;
  const gaugeState = getGaugeState(score);
  const stats = analysis?.stats;
  const displayCharacters = stats?.characters ?? 0;

  const resultGrid = [
    { label: t('tools.wordCounter.words'), value: stats?.words ?? 0 },
    {
      label: t('tools.wordCounter.readingTime'),
      value: stats ? formatReadingTime(stats.reading_time_seconds, t) : t('tools.wordCounter.readingTimePendingShort'),
    },
    { label: t('tools.wordCounter.sentences'), value: stats?.sentences ?? 0 },
    { label: t('tools.wordCounter.charactersNoSpaces'), value: stats?.characters_no_spaces ?? 0 },
    { label: t('tools.wordCounter.paragraphs'), value: stats?.paragraphs ?? 0 },
    { label: t('tools.wordCounter.charactersWithSpaces'), value: stats?.characters ?? 0 },
  ];

  const maxDisplayLimit = PLATFORM_LIMITS[PLATFORM_LIMITS.length - 1].limit;
  const barFillPercent = Math.min((displayCharacters / maxDisplayLimit) * 100, 100);
  const barColor = displayCharacters <= maxDisplayLimit ? '#20c174' : '#ef5d66';

  const actions = [
    {
      key: 'paraphrase' as const,
      icon: RefreshCcw,
      label: t('tools.wordCounter.actions.paraphrase'),
    },
    {
      key: 'grammar' as const,
      icon: CheckCheck,
      label: t('tools.wordCounter.actions.grammar'),
    },
    {
      key: 'detectAi' as const,
      icon: Sparkles,
      label: t('tools.wordCounter.actions.detectAi'),
    },
    {
      key: 'plagiarism' as const,
      icon: ScanSearch,
      label: t('tools.wordCounter.actions.plagiarism'),
    },
  ];

  const actionPrompts: Record<AssistantActionKey, string> = useMemo(
    () => ({
      paraphrase: t('tools.wordCounter.actionPrompts.paraphrase', { text }),
      grammar: t('tools.wordCounter.actionPrompts.grammar', { text }),
      detectAi: t('tools.wordCounter.actionPrompts.detectAi', { text }),
      plagiarism: t('tools.wordCounter.actionPrompts.plagiarism', { text }),
    }),
    [t, text]
  );

  const handleCopy = async () => {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
  };

  const handleExportText = () => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dociva-word-counter.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleAssistantAction = async (action: AssistantActionKey) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setAssistantLoading(action);
    setAssistantError(null);

    try {
      const response = await chatWithAssistant({
        message: actionPrompts[action],
        session_id: assistantSessionId ?? undefined,
        fingerprint: assistantFingerprint,
        tool_slug: 'word-counter',
        page_url: typeof window !== 'undefined' ? window.location.href : '/tools/word-counter',
        locale: i18n.language,
      });

      setAssistantSessionId(response.session_id);
      setAssistantResult({ action, content: response.reply });
    } catch (requestError) {
      setAssistantError(requestError instanceof Error ? requestError.message : t('common.errors.serverError'));
    } finally {
      setAssistantLoading(null);
    }
  };

  const applyAssistantResult = () => {
    if (!assistantResult) return;
    setText(assistantResult.content);
  };

  const goalProgress = goal > 0 ? Math.min((displayCharacters / goal) * 100, 100) : 0;
  const goalRemaining = Math.max(goal - displayCharacters, 0);

  return (
    <>
      <section className="mx-auto max-w-[1032px] px-4 py-4 sm:px-6 sm:py-5">
        <div className="rounded-[30px] bg-[linear-gradient(135deg,rgba(255,232,241,0.72),rgba(239,238,255,0.96)_55%,rgba(226,226,255,0.96))] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[928px]">
            <header className="mb-4 text-center">
              <h1 className="mx-auto inline-block bg-[linear-gradient(90deg,rgba(163,120,255,0.28),rgba(163,120,255,0.08))] px-3 py-1 text-[28px] font-semibold tracking-tight text-slate-950 sm:text-[38px] sm:leading-[1.1]">
                {t('tools.wordCounter.heroTitle')}
              </h1>
              <p className="mx-auto mt-2.5 max-w-[720px] text-sm text-slate-600 sm:text-base">
                {t('tools.wordCounter.heroSubtitle')}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-full bg-white/80 px-3 py-1">{t('tools.wordCounter.trustRealtime', 'Real-time feedback')}</span>
                <span className="rounded-full bg-white/80 px-3 py-1">{t('tools.wordCounter.trustSocial', 'Built for social and ad copy')}</span>
                <span className="rounded-full bg-white/80 px-3 py-1">{t('tools.wordCounter.trustDrafts', 'Local draft autosave')}</span>
              </div>
            </header>

            <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_14px_40px_rgba(104,86,185,0.08)] backdrop-blur">
              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <div className="flex min-h-[480px] flex-col border-b border-slate-200/80 p-5 sm:p-6 lg:h-[520px] lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-[22px] font-semibold text-slate-900">{t('tools.wordCounter.editorTitle')}</h2>
                      <p className="mt-1 text-sm text-slate-500">{t('tools.wordCounter.editorHint')}</p>
                    </div>
                    {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-violet-600" /> : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setText(SAMPLE_POSTS[0])} className="rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100">
                      {t('tools.wordCounter.sampleLaunch')}
                    </button>
                    <button type="button" onClick={() => setText(SAMPLE_POSTS[1])} className="rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100">
                      {t('tools.wordCounter.sampleArabic')}
                    </button>
                    {USE_CASE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setText(preset.text)}
                        className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {restoredDraft && text.trim() && (
                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                      {t('tools.wordCounter.draftRestored', 'Your last draft was restored on this device.')}
                    </div>
                  )}

                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={t('tools.wordCounter.placeholder')}
                    className="mt-3 min-h-[280px] w-full flex-1 resize-none border-0 bg-transparent p-0 text-[16px] leading-7 text-slate-800 outline-none placeholder:text-slate-400 lg:min-h-0"
                    dir="auto"
                  />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-slate-400 sm:text-sm">
                      {t('tools.wordCounter.maxLength', { count: analysis?.input.max_length ?? 20000 })}
                    </div>
                    <div className="flex items-center gap-5 text-violet-700">
                      <button type="button" onClick={() => setText('')} className="inline-flex items-center gap-2 text-sm font-medium transition hover:text-violet-900" disabled={!text}>
                        <RefreshCcw className="h-4 w-4" />
                        {t('tools.wordCounter.clear')}
                      </button>
                      <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 text-sm font-medium transition hover:text-violet-900" disabled={!text.trim()}>
                        <Copy className="h-4 w-4" />
                        {t('tools.wordCounter.copy')}
                      </button>
                      <button type="button" onClick={handleExportText} className="inline-flex items-center gap-2 text-sm font-medium transition hover:text-violet-900" disabled={!text.trim()}>
                        <Download className="h-4 w-4" />
                        {t('tools.wordCounter.export', 'Export')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <h2 className="text-[22px] font-semibold text-slate-900">{t('tools.wordCounter.resultTitle')}</h2>

                  <div className="mt-4">
                    <GaugeCard
                      score={score}
                      label={t(gaugeState.labelKey)}
                      message={error ?? t(gaugeState.messageKey)}
                      color={gaugeState.color}
                      track={gaugeState.track}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {resultGrid.map((item) => (
                      <div key={item.label} className="rounded-[14px] bg-[#fbfbfb] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-600 sm:text-sm">{item.label}</span>
                          <span className="text-xl font-semibold leading-none text-slate-900 sm:text-[26px]">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-[22px] border border-violet-100 bg-violet-50/60 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Goal className="h-4 w-4 text-violet-600" />
                          {t('tools.wordCounter.goalTitle', 'Character goal')}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {goalRemaining > 0
                            ? t('tools.wordCounter.goalRemaining', '{{count}} characters remaining', { count: goalRemaining })
                            : t('tools.wordCounter.goalReached', 'Goal reached')}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={50}
                        max={5000}
                        step={10}
                        value={goal}
                        onChange={(event) => setGoal(Math.max(50, Number(event.target.value) || 50))}
                        className="w-24 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                      />
                    </div>
                    <div className="mt-3 h-[8px] overflow-hidden rounded-full bg-violet-100">
                      <div className="h-full rounded-full bg-violet-600 transition-all duration-300" style={{ width: `${goalProgress}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 rounded-[22px] bg-[#fafafa] px-4 py-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {PLATFORM_LIMITS.map(({ id, label, limit }) => {
                        const Glyph = id === 'instagram'
                          ? InstagramGlyph
                          : id === 'facebook'
                            ? FacebookGlyph
                            : id === 'x'
                              ? XGlyph
                              : LinkedInGlyph;

                        return (
                          <div key={id}>
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm">
                              <Glyph />
                            </div>
                            <div className="mt-3 text-[14px] text-slate-500">{limit}</div>
                            <div className="sr-only">{label}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 h-[8px] overflow-hidden rounded-full bg-[#d7dbe6]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${barFillPercent}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-[22px] bg-[linear-gradient(180deg,#5633ef,#4d2fe0)] p-4 text-white shadow-[0_16px_30px_rgba(86,51,239,0.35)]">
                    <div className="mb-3 text-center text-[20px] font-semibold">{t('tools.wordCounter.actionsTitle')}</div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {actions.map(({ key, icon: Icon, label }) => (
                        <button
                          key={key}
                          type="button"
                          disabled={!text.trim() || assistantLoading !== null}
                          onClick={() => void handleAssistantAction(key)}
                          className="flex items-center gap-3 rounded-[15px] bg-white px-3.5 py-3 text-left text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            {assistantLoading === key ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : <Icon className="h-4.5 w-4.5" />}
                          </span>
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(assistantResult || assistantError) && (
                    <div className="mt-3 rounded-[18px] border border-violet-100 bg-violet-50/60 px-4 py-4 text-sm text-slate-700">
                      <div className="flex items-start gap-3">
                        <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900">
                            {assistantResult
                              ? t(`tools.wordCounter.actions.${assistantResult.action}`)
                              : t('common.error')}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap leading-6">
                            {assistantError ?? assistantResult?.content}
                          </div>
                          {assistantResult && (assistantResult.action === 'paraphrase' || assistantResult.action === 'grammar') && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={applyAssistantResult}
                                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-violet-700"
                              >
                                <Wand2 className="h-3.5 w-3.5" />
                                {t('tools.wordCounter.applyToEditor')}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!assistantResult?.content) return;
                                  await navigator.clipboard.writeText(assistantResult.content);
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3.5 py-2 text-xs font-medium text-violet-700 transition hover:bg-violet-50"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                {t('tools.wordCounter.copyResult')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-start gap-3 rounded-[18px] border border-violet-100 bg-violet-50/60 px-4 py-4 text-sm text-slate-600">
                    <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                    <div>
                      <div className="font-medium text-slate-900">{t('tools.wordCounter.bestFit')}: {analysis?.suggestions.top_priority ?? 'X'}</div>
                      <div className="mt-1">{analysis?.suggestions.summary ?? t('tools.wordCounter.emptySummary')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
