import { useTranslation } from 'react-i18next';

interface UsageBar {
  label: string;
  used: number;
  total: number;
  color: string;
}

interface UsageAnalyticsProps {
  credits: { used: number; total: number };
  dailyOps: { used: number; total: number };
  storage: { usedMB: number; totalMB: number };
  className?: string;
}

function ProgressBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isHigh = pct > 80;

  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-red-500' : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function UsageAnalytics({ credits, dailyOps, storage, className = '' }: UsageAnalyticsProps) {
  const { t } = useTranslation();

  const bars: UsageBar[] = [
    {
      label: t('dashboard.credits', 'Credits'),
      used: credits.used,
      total: credits.total,
      color: 'bg-primary-500',
    },
    {
      label: t('dashboard.dailyOps', 'Daily Operations'),
      used: dailyOps.used,
      total: dailyOps.total,
      color: 'bg-emerald-500',
    },
    {
      label: t('dashboard.storage', 'Storage'),
      used: storage.usedMB,
      total: storage.totalMB,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('dashboard.usageOverview', 'Usage Overview')}
        </h3>
      </div>
      <div className="space-y-5 p-6">
        {bars.map((bar) => {
          const pct = bar.total > 0 ? Math.round((bar.used / bar.total) * 100) : 0;
          return (
            <div key={bar.label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{bar.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {bar.label === t('dashboard.storage', 'Storage')
                    ? `${bar.used} MB / ${bar.total} MB`
                    : `${bar.used} / ${bar.total}`}
                  <span className="ml-1 text-slate-400">({pct}%)</span>
                </span>
              </div>
              <ProgressBar used={bar.used} total={bar.total} color={bar.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
