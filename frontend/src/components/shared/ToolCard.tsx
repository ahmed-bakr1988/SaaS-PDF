import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ToolCardProps {
  /** Tool route path */
  to: string;
  /** Tool title */
  title: string;
  /** Short description */
  description: string;
  /** Pre-rendered icon element */
  icon: ReactNode;
  /** Icon background color class */
  bgColor: string;
  /** Optional credit cost hint */
  creditHint?: string;
  /** Optional speed tier */
  speedTier?: 'instant' | 'fast' | 'moderate';
  /** Optional strategic group */
  group?: string;
}

const SPEED_LABELS: Record<string, { icon: string; label: string }> = {
  instant: { icon: '⚡', label: 'Instant' },
  fast: { icon: '🚀', label: 'Fast' },
  moderate: { icon: '⏱️', label: 'Moderate' },
};

export default function ToolCard({
  to,
  title,
  description,
  icon,
  bgColor,
  creditHint,
  speedTier,
  group,
}: ToolCardProps) {
  const { t } = useTranslation();
  const isAiWorkspace = group === 'ai-workspace';

  return (
    <Link to={to} className="group block h-full">
      <div className={`relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary-500/10 ${
        isAiWorkspace
          ? 'border-2 border-violet-100 ring-violet-200/50 hover:border-violet-300 hover:ring-violet-300/50 dark:border-violet-900/60 dark:ring-violet-800/50 dark:hover:border-violet-700'
          : 'ring-slate-200/60 hover:ring-primary-300/50 dark:ring-slate-800 dark:hover:ring-primary-700/50'
      } dark:bg-slate-900/40`}>
        {/* Top color accent bar — slides in on hover */}
        <div className={`absolute inset-x-0 top-0 h-[4px] origin-left scale-x-0 rounded-t-3xl bg-gradient-to-r ${
          isAiWorkspace
            ? 'from-violet-500 via-purple-500 to-fuchsia-500'
            : 'from-primary-500 via-sky-500 to-accent-500'
        } transition-transform duration-500 group-hover:scale-x-100`} />

        {isAiWorkspace && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
            <Sparkles className="h-2 w-2" />
            AI
          </span>
        )}

        <div className="flex items-start justify-between gap-3">
          {/* Icon + title */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg ${bgColor} dark:ring-white/5 dark:brightness-90`}
            >
              {icon}
            </div>
            <h3 className={`text-sm font-bold leading-snug transition-colors ${
              isAiWorkspace
                ? 'text-violet-900 group-hover:text-violet-700 dark:text-violet-200 dark:group-hover:text-violet-400'
                : 'text-slate-800 group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400'
            }`}>
              {title}
            </h3>
          </div>

          {/* Arrow indicator */}
          <ArrowRight className={`mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 ${
            isAiWorkspace ? 'group-hover:text-violet-500' : 'group-hover:text-primary-500'
          } dark:text-slate-600`} />
        </div>

        <p className="flex-1 text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
          {description}
        </p>

        {/* Credit cost + speed tier badges */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3 dark:border-slate-800/40">
          {creditHint && creditHint !== '0' && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800">
              {creditHint} {t('common.credits', 'credits')}
            </span>
          )}
          {creditHint === '0' && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800">
              {t('common.free', 'Free')}
            </span>
          )}
          {speedTier && SPEED_LABELS[speedTier] && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              {SPEED_LABELS[speedTier].icon} {SPEED_LABELS[speedTier].label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

