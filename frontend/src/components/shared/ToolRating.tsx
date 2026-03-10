import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, ThumbsUp, AlertTriangle, Zap, Send } from 'lucide-react';
import api from '@/services/api';

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
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedTag, setSelectedTag] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      setSubmitted(true);
    } catch {
      setError(t('rating.error', 'Failed to submit rating. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
        <ThumbsUp className="mx-auto mb-3 h-8 w-8 text-green-600 dark:text-green-400" />
        <p className="font-semibold text-green-800 dark:text-green-300">
          {t('rating.thankYou', 'Thank you for your feedback!')}
        </p>
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">
          {t('rating.helpImprove', 'Your rating helps us improve our tools.')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-center text-lg font-semibold text-slate-900 dark:text-white">
        {t('rating.title', 'How was your experience?')}
      </h3>

      {/* Star Rating */}
      <div className="mb-5 flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label={`${star} ${t('rating.stars', 'stars')}`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hoveredStar || rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300 dark:text-slate-600'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Quick Tags */}
      {rating > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {TAGS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedTag(selectedTag === key ? '' : key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedTag === key
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/40 dark:text-primary-300 dark:ring-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`rating.tag.${key}`, key)}
              </button>
            ))}
          </div>

          {/* Optional Feedback */}
          <div className="mb-4">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('rating.feedbackPlaceholder', 'Any additional feedback? (optional)')}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <p className="mb-3 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <Send className="h-4 w-4" />
              {submitting
                ? t('common.processing', 'Processing...')
                : t('rating.submit', 'Submit Rating')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
