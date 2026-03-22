import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { getApiClient } from '../services/api';

const api = getApiClient();

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      const msg = t('auth.resetPassword.tooShort');
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password !== confirm) {
      const msg = t('account.passwordMismatch');
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      toast.success(t('auth.resetPassword.success'));
      setTimeout(() => navigate('/account'), 3000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('auth.resetPassword.error');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-slate-500 dark:text-slate-400">{t('auth.resetPassword.noToken')}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('auth.resetPassword.title')} — {t('common.appName')}</title>
      </Helmet>

      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
            <KeyRound className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('auth.resetPassword.title')}
          </h1>
        </div>

        {success ? (
          <div className="rounded-2xl bg-green-50 p-6 text-center ring-1 ring-green-200 dark:bg-green-900/20 dark:ring-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              {t('auth.resetPassword.success')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auth.resetPassword.newPassword')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('account.confirmPassword')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? t('common.loading') : t('auth.resetPassword.submit')}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
