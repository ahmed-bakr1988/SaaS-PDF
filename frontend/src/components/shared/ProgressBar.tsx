import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ProgressBarProps {
  /** Current task state */
  state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE' | string;
  /** Progress message */
  message?: string;
}

export default function ProgressBar({ state, message }: ProgressBarProps) {
  const { t } = useTranslation();

  const isActive = state === 'PENDING' || state === 'PROCESSING';
  const isComplete = state === 'SUCCESS';

  return (
    <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        {isActive && (
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        )}
        {isComplete && (
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        )}

        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">
            {message || t('common.processing')}
          </p>
        </div>
      </div>

      {/* Animated progress bar for active states */}
      {isActive && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="progress-bar-animated h-full w-2/3 rounded-full bg-primary-500 transition-all" />
        </div>
      )}
    </div>
  );
}
