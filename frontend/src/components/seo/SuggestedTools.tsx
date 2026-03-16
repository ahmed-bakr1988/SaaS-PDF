import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getToolSEO } from '@/config/seoData';

interface SuggestedToolsProps {
  currentSlug: string;
  limit?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  PDF: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Image: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  AI: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  Convert: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Utility: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
};

export default function SuggestedTools({ currentSlug, limit = 3 }: SuggestedToolsProps) {
  const { t } = useTranslation();
  const currentTool = getToolSEO(currentSlug);

  if (!currentTool) {
    return null;
  }

  const relatedTools = currentTool.relatedSlugs
    .map((slug) => getToolSEO(slug))
    .filter(Boolean)
    .slice(0, limit);

  if (relatedTools.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('home.suggestedTools')}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('home.suggestedToolsDesc')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {relatedTools.map((tool) => (
          <Link
            key={tool!.slug}
            to={`/tools/${tool!.slug}`}
            className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-primary-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-600"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-800 group-hover:text-primary-600 dark:text-slate-100 dark:group-hover:text-primary-400">
                {t(`tools.${tool!.i18nKey}.title`)}
              </h4>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[tool!.category] || ''}`}>
                {tool!.category}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {t(`tools.${tool!.i18nKey}.shortDesc`)}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
              {t('common.tryOtherTools')}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}