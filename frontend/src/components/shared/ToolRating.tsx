import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, ThumbsUp, AlertTriangle, Zap, Send, X } from 'lucide-react';
import api from '@/services/api';
import { RATING_PROMPT_EVENT } from '@/utils/ratingPrompt';

interface ToolRatingProps {
  /** Tool slug e.g. "compress-pdf" */
  toolSlug: string;
}

const TAGS = [
  { key: 'fast', icon: Zap },
  { key: 'accurate', icon: ThumbsUp },
  { key: 'issue', icon: AlertTriangle },
] as const;

export default function ToolRating({ toolSlug }: ToolRatingProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedTag, setSelectedTag] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submittedStorageKey = useMemo(() => `tool-rating:submitted:${toolSlug}`, [toolSlug]);
  const dismissedStorageKey = useMemo(() => `tool-rating:dismissed:${toolSlug}`, [toolSlug]);

  const readStorage = useCallback((storage: 'localStorage' | 'sessionStorage', key: string) => {
    if (typeof window === 'undefined') return null;

    try {
      return window[storage].getItem(key);
    } catch {
      return null;
    }
  }, []);

  const writeStorage = useCallback(
    (storage: 'localStorage' | 'sessionStorage', key: string, value: string) => {
      if (typeof window === 'undefined') return;

      try {
        window[storage].setItem(key, value);
      } catch {
        // Ignore storage failures and keep the modal functional.
      }
    },
    []
  );

  const resetForm = useCallback(() => {
    setRating(0);
    setHoveredStar(0);
    setSelectedTag('');
    setFeedback('');
    setSubmitted(false);
    setSubmitting(false);
    setError('');
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);

    if (!submitted) {
      writeStorage('sessionStorage', dismissedStorageKey, '1');
    }
  }, [dismissedStorageKey, submitted, writeStorage]);

  useEffect(() => {
    function handleRatingPrompt(event: Event) {
      const detail = (event as CustomEvent<{ toolSlug?: string; forceOpen?: boolean }>).detail;
      if (!detail?.toolSlug || detail.toolSlug !== toolSlug) return;
      if (readStorage('localStorage', submittedStorageKey)) return;
      if (!detail.forceOpen && readStorage('sessionStorage', dismissedStorageKey)) return;

      resetForm();
      setIsOpen(true);
    }

    window.addEventListener(RATING_PROMPT_EVENT, handleRatingPrompt as EventListener);
    return () => {
      window.removeEventListener(RATING_PROMPT_EVENT, handleRatingPrompt as EventListener);
    };
  }, [dismissedStorageKey, readStorage, resetForm, submittedStorageKey, toolSlug]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeModal();
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal, isOpen]);

  useEffect(() => {
    if (!submitted || !isOpen) return;

    const timer = window.setTimeout(() => {
      setIsOpen(false);
      resetForm();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [isOpen, resetForm, submitted]);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    setError('');

    try {
      await api.post('/ratings/submit', {
        tool: toolSlug,
        rating,
        feedback: feedback.trim(),
        tag: selectedTag,
      });
      writeStorage('localStorage', submittedStorageKey, '1');
      writeStorage('sessionStorage', dismissedStorageKey, '1');
      setSubmitted(true);
    } catch {
      setError(
        t('pages.rating.error', 'Failed to submit rating. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  if (submitted) {
    return (
      <div
        className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-rating-title"
      >
        <div className="modal-content w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <ThumbsUp className="mx-auto mb-3 h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          <p
            id="tool-rating-title"
            className="font-semibold text-emerald-800 dark:text-emerald-300"
          >
            {t('pages.rating.successTitle', 'Thank you for your feedback!')}
          </p>
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
            {t(
              'pages.rating.successBody',
              'Your rating helps us improve the tools and catch issues faster.'
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-rating-title"
      aria-describedby="tool-rating-description"
    >
      <div className="modal-content w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800">
              {t('pages.rating.completedBadge', 'Quick feedback')}
            </span>
            <h3
              id="tool-rating-title"
              className="mt-3 text-xl font-bold text-slate-900 dark:text-white"
            >
              {t('pages.rating.title', 'Rate this tool')}
            </h3>
            <p
              id="tool-rating-description"
              className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              {t(
                'pages.rating.promptBody',
                'A quick rating after download helps us improve this tool and catch issues sooner.'
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label={t('pages.rating.close', 'Close rating dialog')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="rounded-xl p-1.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label={`${star} ${t('pages.rating.stars', 'stars')}`}
            >
              <Star
                className={`h-9 w-9 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              {TAGS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === key ? '' : key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedTag === key
                      ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/40 dark:text-primary-300 dark:ring-primary-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`pages.rating.${key}`, key)}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={t(
                  'pages.rating.feedbackPlaceholder',
                  'Share your experience (optional)'
                )}
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </>
        )}

        {error && (
          <p className="mb-4 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t('pages.rating.later', 'Maybe later')}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            <Send className="h-4 w-4" />
            {submitting
              ? t('common.processing', 'Processing...')
              : t('pages.rating.submit', 'Submit Rating')}
          </button>
        </div>
      </div>
    </div>
  );
}
