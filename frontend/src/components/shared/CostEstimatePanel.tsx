import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Sparkles, AlertTriangle } from 'lucide-react';
import { estimateCost, type CostEstimate } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface CostEstimatePanelProps {
  toolSlug: string;
  file: File | null;
}

export default function CostEstimatePanel({ toolSlug, file }: CostEstimatePanelProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !file) {
      setEstimate(null);
      return;
    }

    let cancelled = false;
    const fileSizeKb = Math.ceil(file.size / 1024);

    setLoading(true);
    estimateCost(toolSlug, fileSizeKb)
      .then((data) => {
        if (!cancelled) setEstimate(data);
      })
      .catch(() => {
        if (!cancelled) setEstimate(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user, file, toolSlug]);

  if (!user || !file || loading || !estimate) return null;

  const isAffordable = estimate.affordable;

  return (
    <div
      className={`mt-3 flex items-center justify-between rounded-xl p-3 text-sm ring-1 ${
        isAffordable
          ? 'bg-primary-50 ring-primary-200 dark:bg-primary-900/20 dark:ring-primary-800'
          : 'bg-red-50 ring-red-200 dark:bg-red-900/20 dark:ring-red-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <Coins className={`h-4 w-4 ${isAffordable ? 'text-primary-600 dark:text-primary-400' : 'text-red-500'}`} />
        <span className={isAffordable ? 'text-slate-700 dark:text-slate-300' : 'text-red-700 dark:text-red-400'}>
          {t('costEstimate.cost')}: <strong>{estimate.quoted_credits}</strong> {t('costEstimate.credits')}
          {estimate.welcome_bonus_applied && (
            <span className="ms-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Sparkles className="h-3 w-3" />
              {t('costEstimate.firstFree')}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {isAffordable ? (
          <span>{t('costEstimate.remaining')}: {estimate.balance_after}</span>
        ) : (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {t('costEstimate.insufficient')}
          </span>
        )}
      </div>
    </div>
  );
}
