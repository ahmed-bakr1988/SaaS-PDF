import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage } from '@/utils/seo';
import { Check, X, Zap, Crown, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import SocialProofStrip from '@/components/shared/SocialProofStrip';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface PlanFeature {
  key: string;
  free: boolean | string;
  pro: boolean | string;
}

const FEATURES: PlanFeature[] = [
  { key: 'webRequests', free: '50/month', pro: '500/month' },
  { key: 'apiAccess', free: false, pro: true },
  { key: 'apiRequests', free: '—', pro: '1,000/month' },
  { key: 'maxFileSize', free: '50 MB', pro: '100 MB' },
  { key: 'historyRetention', free: '25 files', pro: '250 files' },
  { key: 'allTools', free: true, pro: true },
  { key: 'aiTools', free: true, pro: true },
  { key: 'priorityProcessing', free: false, pro: true },
  { key: 'noAds', free: false, pro: true },
  { key: 'emailSupport', free: false, pro: true },
];

export default function PricingPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  async function handleUpgrade(billing: 'monthly' | 'yearly') {
    if (!user) {
      window.location.href = '/account?redirect=pricing';
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/stripe/create-checkout-session`,
        { billing },
        { withCredentials: true },
      );
      if (data.url) window.location.href = data.url;
    } catch {
      // Stripe not configured yet — show message
      alert(t('pages.pricing.stripeNotReady', 'Payment system is being set up. Please try again later.'));
    } finally {
      setLoading(false);
    }
  }

  function renderValue(val: boolean | string) {
    if (val === true) return <Check className="mx-auto h-5 w-5 text-green-500" />;
    if (val === false) return <X className="mx-auto h-5 w-5 text-slate-300 dark:text-slate-600" />;
    return <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{val}</span>;
  }

  return (
    <>
      <SEOHead
        title={t('pages.pricing.title', 'Pricing')}
        description={t('pages.pricing.metaDescription', 'Compare Free and Pro plans for Dociva. Get more file processing power, API access, and priority support.')}
        path="/pricing"
        jsonLd={generateWebPage({
          name: t('pages.pricing.title', 'Pricing'),
          description: t('pages.pricing.metaDescription', 'Compare Free and Pro plans for Dociva.'),
          url: `${window.location.origin}/pricing`,
        })}
      />

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t('pages.pricing.title', 'Simple, Transparent Pricing')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {t('pages.pricing.subtitle', 'Start free with all tools. Upgrade when you need more power.')}
          </p>
        </div>

        <SocialProofStrip className="mb-12" />

        {/* Plan Cards */}
        <div className="mb-16 grid gap-8 md:grid-cols-2">
          {/* Free Plan */}
          <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                <Zap className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('pages.pricing.freePlan', 'Free')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('pages.pricing.freeDesc', 'For personal use')}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$0</span>
              <span className="text-slate-500 dark:text-slate-400"> / {t('pages.pricing.month', 'month')}</span>
            </div>

            <ul className="mb-8 space-y-3">
              {FEATURES.filter((f) => f.free !== false).map((f) => (
                <li key={f.key} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                  {t(`pages.pricing.features.${f.key}`, f.key)}
                  {typeof f.free === 'string' && (
                    <span className="ml-auto text-xs font-medium text-slate-500">({f.free})</span>
                  )}
                </li>
              ))}
            </ul>

            <Link
              to="/"
              className="block w-full rounded-xl border border-slate-300 bg-white py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              {t('pages.pricing.getStarted', 'Get Started Free')}
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-2xl border-2 border-primary-500 bg-white p-8 shadow-lg dark:bg-slate-800">
            <div className="absolute -top-3 right-6 rounded-full bg-primary-600 px-4 py-1 text-xs font-bold text-white">
              {t('pages.pricing.popular', 'MOST POPULAR')}
            </div>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                <Crown className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('pages.pricing.proPlan', 'Pro')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('pages.pricing.proDesc', 'For professionals & teams')}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$9</span>
              <span className="text-slate-500 dark:text-slate-400"> / {t('pages.pricing.month', 'month')}</span>
            </div>

            <ul className="mb-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.key} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="h-4 w-4 shrink-0 text-primary-500" />
                  {t(`pages.pricing.features.${f.key}`, f.key)}
                  {typeof f.pro === 'string' && (
                    <span className="ml-auto text-xs font-medium text-primary-600 dark:text-primary-400">({f.pro})</span>
                  )}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={loading || user?.plan === 'pro'}
              className="block w-full rounded-xl bg-primary-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : user?.plan === 'pro' ? (
                t('pages.pricing.currentPlan', 'Current Plan')
              ) : (
                t('pages.pricing.upgradeToPro', 'Upgrade to Pro')
              )}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              {t('pages.pricing.securePayment', 'Secure payment via Stripe')}
            </p>
          </div>
        </div>

        <section className="mb-16 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('pages.pricing.trustTitle')}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              {t('pages.pricing.trustSubtitle')}
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('pages.pricing.trustFastTitle')}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{t('pages.pricing.trustFastDesc')}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('pages.pricing.trustPrivateTitle')}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{t('pages.pricing.trustPrivateDesc')}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('pages.pricing.trustApiTitle')}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{t('pages.pricing.trustApiDesc')}</p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <div className="mb-16 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-200">
                  {t('pages.pricing.feature', 'Feature')}
                </th>
                <th className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                  {t('pages.pricing.freePlan', 'Free')}
                </th>
                <th className="px-6 py-4 text-center font-semibold text-primary-600 dark:text-primary-400">
                  {t('pages.pricing.proPlan', 'Pro')}
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, idx) => (
                <tr
                  key={f.key}
                  className={`border-b border-slate-100 dark:border-slate-700/50 ${
                    idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                    {t(`pages.pricing.features.${f.key}`, f.key)}
                  </td>
                  <td className="px-6 py-3 text-center">{renderValue(f.free)}</td>
                  <td className="px-6 py-3 text-center">{renderValue(f.pro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
            {t('pages.pricing.faqTitle', 'Frequently Asked Questions')}
          </h2>
          <div className="space-y-6 text-left">
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
                {t('pages.pricing.faq1q', 'Is the Free plan really free?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('pages.pricing.faq1a', 'Yes! All 32+ tools are available for free with generous monthly limits. No credit card required.')}
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
                {t('pages.pricing.faq2q', 'Can I cancel the Pro plan anytime?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('pages.pricing.faq2a', 'Absolutely. Cancel anytime — no questions asked. Your account reverts to the Free plan.')}
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
                {t('pages.pricing.faq3q', 'What payment methods do you accept?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('pages.pricing.faq3a', 'We accept all major credit/debit cards via Stripe. Your payment information is securely processed — we never see your card details.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
