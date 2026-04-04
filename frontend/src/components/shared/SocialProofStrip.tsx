import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { getToolSEO } from '@/config/seoData';
import { getPublicStats, type PublicStatsSummary } from '@/services/api';

interface SocialProofStripProps {
  className?: string;
}

export default function SocialProofStrip({ className = '' }: SocialProofStripProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<PublicStatsSummary | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;

    getPublicStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible]);

  if (!stats) {
    return (
      <section
        ref={sectionRef}
        aria-hidden="true"
        className={`min-h-[260px] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 ${className}`.trim()}
      >
        <div className="flex min-h-[212px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl flex-1">
            <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-8 w-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-4 w-5/6 max-w-lg animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <span
                  key={index}
                  className="h-7 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="h-3 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="mt-3 h-8 w-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div className="h-4 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </section>
    );
  }

  const hasReliableUsageStats = stats.total_files_processed >= 25;
  const hasReliableRating = stats.rating_count >= 3;

  const topTools = stats.top_tools.slice(0, 3).map((tool) => {
    const seo = getToolSEO(tool.tool);
    return seo ? t(`tools.${seo.i18nKey}.title`) : tool.tool;
  });

  const cards = [
    hasReliableUsageStats
      ? { label: t('socialProof.processedFiles'), value: stats.total_files_processed.toLocaleString() }
      : null,
    hasReliableUsageStats
      ? { label: t('socialProof.successRate'), value: `${stats.success_rate}%` }
      : null,
    hasReliableUsageStats
      ? { label: t('socialProof.last24h'), value: stats.files_last_24h.toLocaleString() }
      : null,
    hasReliableRating
      ? { label: t('socialProof.averageRating'), value: `${stats.average_rating.toFixed(1)} / 5` }
      : null,
  ].filter((card): card is { label: string; value: string } => Boolean(card));

  return (
    <section ref={sectionRef} className={`min-h-[260px] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 ${className}`.trim()}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
            {t('socialProof.badge')}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {t('socialProof.title')}
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {t('socialProof.subtitle')}
          </p>
          {topTools.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {topTools.map((tool) => (
                <span key={tool} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {tool}
                </span>
              ))}
            </div>
          )}
        </div>

        {cards.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300 lg:max-w-md">
            {t(
              'socialProof.pendingSummary',
              'Public activity metrics appear here after we collect enough completed jobs and verified ratings.'
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <p className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Star className="h-4 w-4 text-amber-500" />
          {hasReliableRating
            ? t('socialProof.basedOnRatings', { count: stats.rating_count })
            : t('socialProof.pendingRatings', 'Ratings summary will unlock after enough verified feedback.')}
        </p>
        <Link to="/developers" className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          {t('socialProof.viewDevelopers')}
        </Link>
      </div>
    </section>
  );
}