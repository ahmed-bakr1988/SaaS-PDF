import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1';

type ConsentState = 'pending' | 'accepted' | 'rejected';

function getStoredConsent(): ConsentState {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return 'pending';
    const parsed = JSON.parse(raw);
    if (parsed?.version === CONSENT_VERSION) return parsed.state as ConsentState;
    return 'pending';
  } catch {
    return 'pending';
  }
}

function storeConsent(state: ConsentState) {
  localStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({ state, version: CONSENT_VERSION, timestamp: Date.now() }),
  );
}

/**
 * Emit a custom event so analytics.ts can listen for consent changes.
 */
function dispatchConsentEvent(accepted: boolean) {
  window.dispatchEvent(
    new CustomEvent('cookie-consent', { detail: { accepted } }),
  );
}

export function hasAnalyticsConsent(): boolean {
  return getStoredConsent() === 'accepted';
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === 'pending') {
      // Small delay so it doesn't block LCP
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    storeConsent('accepted');
    dispatchConsentEvent(true);
    setVisible(false);
  }

  function handleReject() {
    storeConsent('rejected');
    dispatchConsentEvent(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('cookie.title', 'Cookie Consent')}
      className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:flex sm:items-start sm:gap-4">
        <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 sm:mb-0">
          <Cookie className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
            {t('cookie.title', 'We use cookies')}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {t(
              'cookie.message',
              'We use essential cookies for site functionality and optional analytics cookies (Google Analytics) to improve your experience. You can accept or reject non-essential cookies.',
            )}{' '}
            <Link
              to="/privacy"
              className="font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {t('cookie.learnMore', 'Learn more')}
            </Link>
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleAccept}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              {t('cookie.accept', 'Accept All')}
            </button>
            <button
              onClick={handleReject}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:focus:ring-offset-slate-800"
            >
              {t('cookie.reject', 'Reject Non-Essential')}
            </button>
          </div>
        </div>

        <button
          onClick={handleReject}
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300 sm:static"
          aria-label={t('common.close', 'Close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
