import React, { useState } from 'react';
import { AlertCircle, RefreshCw, HelpCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ErrorMessageProps {
  message?: string;
  type?: 'error' | 'warning' | 'info';
  details?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  showRetry?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  suggestion?: string;
  helpLink?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export default function ErrorMessage({
  message = 'An error occurred',
  type = 'error',
  details,
  showDetails: initialShowDetails = false,
  onRetry,
  showRetry = true,
  actions,
  suggestion,
  helpLink,
  dismissible = true,
  onDismiss,
}: ErrorMessageProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const bgColor =
    type === 'error'
      ? 'bg-red-50 dark:bg-red-900/20'
      : type === 'warning'
      ? 'bg-amber-50 dark:bg-amber-900/20'
      : 'bg-blue-50 dark:bg-blue-900/20';

  const borderColor =
    type === 'error'
      ? 'border-red-200 dark:border-red-800'
      : type === 'warning'
      ? 'border-amber-200 dark:border-amber-800'
      : 'border-blue-200 dark:border-blue-800';

  const textColor =
    type === 'error'
      ? 'text-red-900 dark:text-red-200'
      : type === 'warning'
      ? 'text-amber-900 dark:text-amber-200'
      : 'text-blue-900 dark:text-blue-200';

  const iconColor =
    type === 'error'
      ? 'text-red-600 dark:text-red-400'
      : type === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-blue-600 dark:text-blue-400';

  const Icon = type === 'warning' ? AlertTriangle : AlertCircle;

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />

        <div className="flex-1">
          <h3 className={`font-semibold ${textColor}`}>{message}</h3>

          {suggestion && (
            <p className={`mt-1 text-sm ${textColor} opacity-80`}>{suggestion}</p>
          )}

          {details && !showDetails && (
            <button
              onClick={() => setShowDetails(true)}
              className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${textColor} opacity-80 hover:opacity-100`}
            >
              <HelpCircle className="h-4 w-4" />
              {t('common.showDetails', { defaultValue: 'Show Details' })}
            </button>
          )}

          {details && showDetails && (
            <details open className="mt-3">
              <summary className={`cursor-pointer text-sm font-medium ${textColor} opacity-80`}>
                {t('common.hideDetails', { defaultValue: 'Hide Details' })}
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-black/10 p-3 text-xs text-slate-900 dark:text-slate-100">
                {details}
              </pre>
            </details>
          )}

          {(onRetry || actions || helpLink) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && showRetry && (
                <button
                  onClick={onRetry}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    type === 'error'
                      ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
                      : type === 'warning'
                      ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('common.retry', { defaultValue: 'Retry' })}
                </button>
              )}

              {actions?.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    action.variant === 'primary'
                      ? type === 'error'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                  }`}
                >
                  {action.label}
                </button>
              ))}

              {helpLink && (
                <a
                  href={helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-700"
                >
                  {t('common.getHelp', { defaultValue: 'Get Help' })}
                </a>
              )}
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={() => {
              setIsDismissed(true);
              onDismiss?.();
            }}
            className={`flex-shrink-0 text-xl font-bold opacity-50 hover:opacity-100 transition-opacity ${textColor}`}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
