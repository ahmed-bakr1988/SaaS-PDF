import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ProgressBarProps {
  /** Current task state */
  state?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE' | string;
  status?: string; // Alternative to state (for compatibility)
  /** Progress message */
  message?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Show detailed steps */
  steps?: Array<{
    name: string;
    status: 'pending' | 'active' | 'complete' | 'error';
    message?: string;
  }>;
  /** Show a simple indeterminate progress bar */
  indeterminate?: boolean;
}

export default function ProgressBar({
  state,
  status,
  message,
  progress,
  steps,
  indeterminate = true,
}: ProgressBarProps) {
  const { t } = useTranslation();
  const taskState = state || status || 'PROCESSING';

  const isActive = taskState === 'PENDING' || taskState === 'PROCESSING';
  const isComplete = taskState === 'SUCCESS';
  const isError = taskState === 'FAILURE';

  return (
    <div className="space-y-4">
      {/* Main Progress Card */}
      <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="flex items-center gap-3">
          {isActive && (
            <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
          )}
          {isComplete && (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          )}
          {isError && (
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          )}
          {!isActive && !isComplete && !isError && (
            <Clock className="h-6 w-6 text-slate-400 dark:text-slate-600" />
          )}

          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {message || t('common.processing', { defaultValue: 'Processing...' })}
            </p>
            {progress !== undefined && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {progress}%
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {indeterminate && isActive && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="progress-bar-animated h-full w-2/3 rounded-full bg-primary-500 transition-all" />
          </div>
        )}

        {/* Determinate Progress Bar */}
        {!indeterminate && progress !== undefined && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full transition-all duration-300 ${
                  isError ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Progress */}
      {steps && steps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t('common.processingSteps', { defaultValue: 'Processing Steps' })}
          </h3>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {step.status === 'complete' && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  )}
                  {step.status === 'active' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400 flex-shrink-0" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  {step.status === 'pending' && (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step.status === 'complete'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : step.status === 'active'
                        ? 'text-primary-700 dark:text-primary-300'
                        : step.status === 'error'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {step.name}
                  </p>
                  {step.message && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                      {step.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
