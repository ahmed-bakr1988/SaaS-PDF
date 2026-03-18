import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Mail } from 'lucide-react';
import { getApiClient } from '../services/api';

const api = getApiClient();

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      setError(t('auth.forgotPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('auth.forgotPassword.title')} — {t('common.appName')}</title>
      </Helmet>

      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
            <Mail className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('auth.forgotPassword.title')}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t('auth.forgotPassword.subtitle')}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl bg-green-50 p-6 text-center ring-1 ring-green-200 dark:bg-green-900/20 dark:ring-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              {t('auth.forgotPassword.sent')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('common.email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('account.emailPlaceholder')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.forgotPassword.submit')}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
