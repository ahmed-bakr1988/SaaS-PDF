import { useEffect, useState } from 'react';
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

  useEffect(() => {
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
  }, []);

  if (!stats) {
    return null;
  }

  const topTools = stats.top_tools.slice(0, 3).map((tool) => {
    const seo = getToolSEO(tool.tool);
    return seo ? t(`tools.${seo.i18nKey}.title`) : tool.tool;
  });

  const cards = [
    { label: t('socialProof.processedFiles'), value: stats.total_files_processed.toLocaleString() },
    { label: t('socialProof.successRate'), value: `${stats.success_rate}%` },
    { label: t('socialProof.last24h'), value: stats.files_last_24h.toLocaleString() },
    { label: t('socialProof.averageRating'), value: `${stats.average_rating.toFixed(1)} / 5` },
  ];

  return (
    <section className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 ${className}`.trim()}>
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

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <p className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Star className="h-4 w-4 text-amber-500" />
          {t('socialProof.basedOnRatings', { count: stats.rating_count })}
        </p>
        <Link to="/developers" className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          {t('socialProof.viewDevelopers')}
        </Link>
      </div>
    </section>
  );
}