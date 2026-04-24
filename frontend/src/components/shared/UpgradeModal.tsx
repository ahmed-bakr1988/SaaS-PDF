import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Crown,
  X,
  Zap,
  Shield,
  Infinity,
  Sparkles,
  Clock,
  Ban,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getApiClient } from '@/services/api';

const api = getApiClient();

interface UpgradeModalProps {
  onClose: () => void;
  /** Optional context about why the modal appeared. */
  reason?: 'credits_exhausted' | 'file_too_large' | 'feature_locked' | 'general';
  /** Remaining credits (shown when credits_exhausted). */
  creditsRemaining?: number;
  /** Credits required for the blocked action. */
  creditsRequired?: number;
}

const PRO_BENEFITS = [
  { icon: Infinity, key: 'moreCredits' },
  { icon: Ban, key: 'noAds' },
  { icon: Zap, key: 'priorityProcessing' },
  { icon: Shield, key: 'largerFiles' },
  { icon: Clock, key: 'longerHistory' },
  { icon: Sparkles, key: 'apiAccess' },
] as const;

export default function UpgradeModal({
  onClose,
  reason = 'general',
  creditsRemaining,
  creditsRequired,
}: UpgradeModalProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  const reasonTitle: Record<string, string> = {
    credits_exhausted: t(
      'upgrade.reason.creditsExhausted',
      'Your credits are running low',
    ),
    file_too_large: t(
      'upgrade.reason.fileTooLarge',
      'This file exceeds your plan limit',
    ),
    feature_locked: t(
      'upgrade.reason.featureLocked',
      'This feature requires Pro',
    ),
    general: t('upgrade.reason.general', 'Unlock the full power of Dociva'),
  };

  async function handleUpgrade() {
    if (!user) {
      // Redirect to account page first
      window.location.href = '/account?redirect=pricing';
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/paypal/create-subscription', {
        billing,
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // If PayPal isn't configured, redirect to pricing page
      window.location.href = '/pricing';
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-800">
        {/* Gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-violet-500 px-6 pb-8 pt-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute end-4 top-4 rounded-full bg-white/20 p-1.5 text-white/80 transition-colors hover:bg-white/30 hover:text-white"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Decorative circles */}
          <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-6 -start-6 h-24 w-24 rounded-full bg-white/5" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white">
              <Crown className="h-3.5 w-3.5" />
              {t('upgrade.badge', 'PRO')}
            </div>
            <h3 className="text-xl font-bold text-white sm:text-2xl">
              {reasonTitle[reason] || reasonTitle.general}
            </h3>

            {reason === 'credits_exhausted' &&
              creditsRemaining !== undefined &&
              creditsRequired !== undefined && (
                <p className="mt-2 text-sm text-white/80">
                  {t(
                    'upgrade.creditsInfo',
                    '{{remaining}} credits remaining, {{required}} required for this action.',
                    {
                      remaining: creditsRemaining,
                      required: creditsRequired,
                    },
                  )}
                </p>
              )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          {/* Benefits list */}
          <ul className="mb-5 grid grid-cols-2 gap-2.5">
            {PRO_BENEFITS.map(({ icon: Icon, key }) => (
              <li
                key={key}
                className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-700/50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {t(`upgrade.benefits.${key}`)}
                </span>
              </li>
            ))}
          </ul>

          {/* Billing toggle */}
          <div className="mb-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                billing === 'monthly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t('upgrade.monthly', '$9.99/mo')}
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                billing === 'yearly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t('upgrade.yearly', '$7.99/mo')}
              <span className="ms-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {t('upgrade.save', 'SAVE 20%')}
              </span>
            </button>
          </div>

          {/* Trial notice */}
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm dark:border-amber-800/40 dark:bg-amber-900/20">
            <span className="font-medium text-amber-800 dark:text-amber-200">
              🎁 {t('upgrade.trialNotice', 'Start with a 7-day free trial — cancel anytime!')}
            </span>
          </div>

          {/* CTA buttons */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Crown className="h-4 w-4" />
                {t('upgrade.cta', 'Start Free Trial')}
              </>
            )}
          </button>

          <Link
            to="/pricing"
            onClick={onClose}
            className="block text-center text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
          >
            {t('upgrade.comparePlans', 'Compare all plans →')}
          </Link>
        </div>
      </div>
    </div>
  );
}
