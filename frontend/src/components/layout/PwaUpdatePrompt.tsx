import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePwaRegistration } from '../../hooks/usePwaRegistration';

/**
 * Renders a bottom-right toast when a new service-worker version is available.
 * The user can choose to reload immediately or dismiss.
 */
export default function PwaUpdatePrompt() {
  const { needRefresh, acceptUpdate, dismissUpdate } = usePwaRegistration();
  const { t } = useTranslation();

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:bottom-6 sm:right-6"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
        <RefreshCw className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('pwa.updateAvailable', 'Update available')}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t('pwa.updateDescription', 'A new version is ready. Reload to get the latest features.')}
        </p>
        <button
          onClick={acceptUpdate}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 active:scale-[0.98]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('pwa.reload', 'Reload')}
        </button>
      </div>
      <button
        onClick={dismissUpdate}
        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
