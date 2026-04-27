import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import { ArrowRight, Check, Coins, Crown, Loader2, Scale, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import SocialProofStrip from '@/components/shared/SocialProofStrip';
import { getApiClient } from '@/services/api';

const api = getApiClient();

interface PlanFeature {
  key: string;
  free: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

const FEATURES: PlanFeature[] = [
  { key: 'credits', free: '50 credits/30 days', pro: '500 credits/30 days', enterprise: 'Unlimited' },
  { key: 'apiAccess', free: false, pro: true, enterprise: true },
  { key: 'apiRequests', free: '—', pro: '1,000/month', enterprise: 'Unlimited' },
  { key: 'maxFileSize', free: '50 MB', pro: '100 MB', enterprise: '500 MB' },
  { key: 'historyRetention', free: '25 files', pro: '250 files', enterprise: 'Unlimited' },
  { key: 'allTools', free: true, pro: true, enterprise: true },
  { key: 'aiTools', free: true, pro: true, enterprise: true },
  { key: 'priorityProcessing', free: false, pro: true, enterprise: true },
  { key: 'noAds', free: false, pro: true, enterprise: true },
  { key: 'emailSupport', free: false, pro: true, enterprise: true },
  { key: 'customIntegrations', free: false, pro: false, enterprise: true },
  { key: 'dedicatedSupport', free: false, pro: false, enterprise: true },
  { key: 'userManagement', free: false, pro: false, enterprise: true },
];

const MONTHLY_PRICES = { free: 0, pro: 9.99, enterprise: 29.99 };
const YEARLY_PRICES = { free: 0, pro: 7.99, enterprise: 24.99 };

export default function PricingPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  // Hide already-purchased plans for the current user
  const showPro = !user || user.plan !== 'pro';
  const showEnterprise = !user || user.plan !== 'enterprise';
  // Simple coins banner for project credits
  const coinsBanner = (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold text-slate-900 dark:text-white">500 Coins</span>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300">
        {t('pages.pricing.coinsNote', 'Contact Management to request more.')} 
        <Link to="/contact" className="ml-2 text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          {t('pages.pricing.contactManagement', 'Management')}
        </Link>
      </div>
    </div>
  );

  async function handleUpgrade(plan: 'pro' | 'enterprise') {
    // Track interest in paid plan
    try {
      // NOTE: `api` is configured with baseURL '/api' and absolute paths (leading '/')
      // bypass baseURL in axios, so keep these as relative URLs.
      await api.post('internal/admin/plan-interest/record', { plan, billing });
    } catch {
      // Non-critical — don't block the flow
    }

    if (plan === 'enterprise') {
      window.location.href = '/contact';
      return;
    }

    if (!user) {
      window.location.href = '/account?redirect=pricing';
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('paypal/create-subscription', { billing });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('PayPal create-subscription error:', err);
      const message = err instanceof Error ? err.message : '';
      alert(message || t('pages.pricing.checkoutNotReady', 'Payment system is being set up. Please try again later.'));
    } finally {
      setLoading(false);
    }
  }

  const prices = billing === 'yearly' ? YEARLY_PRICES : MONTHLY_PRICES;

  return (
    <>
      <SEOHead
        title={t('pages.pricing.title', 'Pricing')}
        description={t('pages.pricing.metaDescription', 'Compare Free, Pro, and Enterprise plans for Dociva. Get more file processing power, API access, and priority support.')}
        path="/pricing"
        jsonLd={generateWebPage({
          name: t('pages.pricing.title', 'Pricing'),
          description: t('pages.pricing.metaDescription', 'Compare plans for Dociva.'),
          url: `${siteOrigin}/pricing`,
        })}
      />

      <div className="mx-auto max-w-6xl">
        {/* Header + billing toggle */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            {t('pages.pricing.title', 'Simple, Transparent Pricing')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {t('pages.pricing.subtitle', 'Unlock the power of your PDFs with flexible plans.')}
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                billing === 'monthly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t('pages.pricing.monthly', 'Monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                billing === 'yearly'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t('pages.pricing.yearly', 'Yearly')}
            </button>
          </div>

          {/* Transparency callout */}
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-primary-200 bg-primary-50/80 p-5 text-start shadow-sm dark:border-primary-900/40 dark:bg-primary-900/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="mt-0.5 rounded-2xl bg-white p-2 text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-300">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    {t('pages.pricing.transparencyTitle')}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t('pages.pricing.transparencyBody')}
                  </p>
                </div>
              </div>
              <Link
                to="/pricing-transparency"
                className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:bg-slate-900 dark:text-primary-300 dark:hover:bg-slate-800"
              >
                <Coins className="h-4 w-4" />
                {t('pages.pricing.transparencyAction')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="deferred-section mb-12">
          <SocialProofStrip />
        </div>

        {/* 3-tier Plan Cards */}
        {coinsBanner}
        <div className="mb-16 grid gap-8 md:grid-cols-3">
          {/* Free Plan */}
          <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 rounded-xl bg-gradient-to-r from-primary-100 to-primary-50 py-3 text-center dark:from-primary-900/30 dark:to-primary-900/10">
              <h2 className="text-lg font-bold text-primary-700 dark:text-primary-300">
                {t('pages.pricing.freePlan', 'Free')}
              </h2>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${prices.free}</span>
              <span className="text-slate-500 dark:text-slate-400"> / {t('pages.pricing.month', 'month')}</span>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {FEATURES.filter((f) => f.free !== false).map((f) => (
                <li key={f.key} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <span>
                    {t(`pages.pricing.features.${f.key}`, f.key)}
                    {typeof f.free === 'string' && (
                      <span className="ml-1 text-xs text-slate-500">({f.free})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/"
              className="block w-full rounded-xl border border-primary-300 bg-white py-3 text-center text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:bg-slate-700 dark:text-primary-300 dark:hover:bg-slate-600"
            >
              {t('pages.pricing.getStarted', 'Get Started')}
            </Link>
          </div>
          {showPro && (
            <div className="relative flex flex-col rounded-2xl border-2 border-primary-500 bg-white p-8 shadow-lg dark:bg-slate-800">
            <div className="absolute -top-3 right-6 rounded-full bg-slate-800 px-4 py-1 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
              {t('pages.pricing.popular', 'MOST POPULAR')}
            </div>

            <div className="mb-6 rounded-xl bg-gradient-to-r from-primary-600 via-primary-500 to-violet-500 py-3 text-center">
              <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-white">
                <Crown className="h-5 w-5" />
                {t('pages.pricing.proPlan', 'Pro')}
              </h2>
            </div>

            <div className="mb-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${prices.pro}</span>
              <span className="text-slate-500 dark:text-slate-400"> / {t('pages.pricing.month', 'month')}</span>
            </div>
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              🎁 {t('pages.pricing.trialBadge', '2-day free trial included')}
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {FEATURES.filter((f) => f.pro !== false).map((f) => (
                <li key={f.key} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <span>
                    {t(`pages.pricing.features.${f.key}`, f.key)}
                    {typeof f.pro === 'string' && (
                      <span className="ml-1 text-xs text-primary-600 dark:text-primary-400">({f.pro})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade('pro')}
              disabled={loading || user?.plan === 'pro'}
              className="block w-full rounded-xl bg-primary-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : user?.plan === 'pro' ? (
                t('pages.pricing.currentPlan', 'Current Plan')
              ) : (
                t('pages.pricing.startFreeTrial', 'Start Your Free Trial')
              )}
            </button>
            </div>
          )}

          {showEnterprise && (
            <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-6 rounded-xl bg-gradient-to-r from-violet-200 to-violet-100 py-3 text-center dark:from-violet-900/30 dark:to-violet-900/10">
                <h2 className="text-lg font-bold text-violet-700 dark:text-violet-300">
                  {t('pages.pricing.enterprisePlan', 'Enterprise')}
                </h2>
              </div>

              <div className="mb-2">
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${prices.enterprise}</span>
                  <span className="text-slate-500 dark:text-slate-400"> / {t('pages.pricing.month', 'month')}</span>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {FEATURES.filter((f) => f.enterprise !== false).map((f) => (
                    <li key={f.key} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span>
                        {t(`pages.pricing.features.${f.key}`, f.key)}
                        {typeof f.enterprise === 'string' && (
                          <span className="ml-1 text-xs text-violet-600 dark:text-violet-400">({f.enterprise})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade('enterprise')}
                  className="block w-full rounded-xl border border-violet-300 bg-violet-50 py-3 text-center text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/40"
                >
                  {t('pages.pricing.contactSales', 'Contact Sales')}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Trust section */}
        <section className="deferred-section mb-16 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
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

        {/* Bottom trust badges */}
        <div className="mb-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('pages.pricing.securePayment', 'Secure Payment')}
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t('pages.pricing.moneyBack', '30-Day Money Back Guarantee')}
          </div>
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
                {t('pages.pricing.faq3a', 'We accept major credit and debit cards and PayPal. Payments are processed securely — we never see your card details.')}
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
                {t('pages.pricing.faq4q', 'How does the 7-day free trial work?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('pages.pricing.faq4a', 'When you subscribe to Pro, you get 7 days completely free. You can cancel at any time during the trial and you won\'t be charged. After the trial, your subscription starts automatically.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
