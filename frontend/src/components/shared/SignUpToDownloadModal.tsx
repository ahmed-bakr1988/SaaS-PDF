import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, LogIn, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { claimTask } from '@/services/api';

interface SignUpToDownloadModalProps {
  onClose: () => void;
  /** Download task ID extracted from the download URL. */
  taskId?: string;
  /** Tool slug for credit accounting. */
  toolSlug?: string;
}

export default function SignUpToDownloadModal({
  onClose,
  taskId,
  toolSlug,
}: SignUpToDownloadModalProps) {
  const { t } = useTranslation();
  const { login, register } = useAuthStore();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError(t('account.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }

      // Claim the anonymous task into the new account's history
      if (taskId && toolSlug) {
        try {
          await claimTask(taskId, toolSlug);
        } catch {
          // Non-blocking — file is still downloadable via session
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute end-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <UserPlus className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('downloadGate.title')}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('downloadGate.subtitle')}
          </p>
        </div>

        {/* Benefits — compact */}
        <ul className="mb-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          {[
            t('downloadGate.benefit1'),
            t('downloadGate.benefit2'),
            t('downloadGate.benefit3'),
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              {b}
            </li>
          ))}
        </ul>

        {/* Inline auth form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('account.emailPlaceholder')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-primary-900/30"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('account.passwordPlaceholder')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-primary-900/30"
          />
          {mode === 'register' && (
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('account.confirmPasswordPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-primary-900/30"
            />
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'register' ? (
              <><UserPlus className="h-4 w-4" /> {t('account.submitRegister')}</>
            ) : (
              <><LogIn className="h-4 w-4" /> {t('account.submitLogin')}</>
            )}
          </button>
        </form>

        {/* Toggle login / register */}
        <button
          type="button"
          onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(null); }}
          className="mt-3 w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {mode === 'register' ? t('downloadGate.signIn') : t('downloadGate.switchToRegister')}
        </button>
      </div>
    </div>
  );
}
