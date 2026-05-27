import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { getSiteOrigin } from '@/utils/seo';
import {
  Check, Zap, Crown, Building2, Star, Loader2,
  ArrowRight, FileText, Lock, Globe, Palette, Plus, Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getApiClient } from '@/services/api';

const api = getApiClient();

interface PlanOption {
  id: 'starter' | 'pro' | 'business';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  credits: number;
  description: string;
  badge?: string;
  highlight?: boolean;
  icon: React.ReactNode;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

const PLANS: PlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 4.99,
    yearlyPrice: 3.99,
    credits: 200,
    description: 'Great for individuals who work with PDFs regularly.',
    badge: 'Best Value',
    icon: <Star className="h-5 w-5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-400',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    credits: 1000,
    description: 'Unlimited power with AI features for power users.',
    badge: 'Most Popular',
    highlight: true,
    icon: <Crown className="h-5 w-5" />,
    color: 'text-violet-600 dark:text-violet-400',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-indigo-500',
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 29.99,
    yearlyPrice: 24.99,
    credits: 0,
    description: 'Teams, API access, white-label & priority support.',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-amber-600 dark:text-amber-400',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-400',
  },
];

const FEATURES = [
  { icon: <FileText className="h-5 w-5" />, label: 'Edit & save your PDF documents' },
  { icon: <Lock className="h-5 w-5" />, label: 'Access your documents from any device' },
  { icon: <Globe className="h-5 w-5" />, label: 'Sign documents online via the internet' },
  { icon: <Palette className="h-5 w-5" />, label: 'Use ready-made templates' },
  { icon: <Plus className="h-5 w-5" />, label: 'Add new customizable fields' },
  { icon: <Sparkles className="h-5 w-5" />, label: 'Create your own templates' },
];

export default function BalanceDepletedPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.initialized);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const toolSlug = searchParams.get('tool') || 'html-to-pdf';
  const returnUrl = searchParams.get('return') || `/tools/${toolSlug}`;

  useEffect(() => {
    if (!authInitialized) {
      return;
    }
    if (!user) {
      const accountQuery = new URLSearchParams({
        redirect: 'balance-depleted',
        return: returnUrl,
        tool: toolSlug,
      });
      navigate(`/account?${accountQuery.toString()}`);
    }
  }, [user, authInitialized, navigate, returnUrl, toolSlug]);

  async function handleSelectPlan(plan: PlanOption) {
    if (!user) return;
    setSelectedPlan(plan.id);
    setLoadingPlan(plan.id);
    try {
      await api.post('internal/admin/plan-interest/record', { plan: plan.id, billing }).catch(() => {});
      navigate(`/payment?plan=${plan.id}&billing=${billing}&return=${encodeURIComponent(returnUrl)}`);
    } catch {
      alert(t('payment.errorGeneric') || 'Something went wrong. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  function getPrice(plan: PlanOption) {
    return billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  }

  if (!authInitialized || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400" />
      </div>
    );
  }

  const isRTL = i18n.dir() === 'rtl';

  return (
    <>
      <SEOHead
        title={t('balanceDepleted.metaTitle', 'Recharge Credits — Dociva')}
        description={t('balanceDepleted.metaDesc', 'Your credits have run out. Choose a plan to continue processing your documents.')}
        path="/balance-depleted"
      />

      <div className="mx-auto max-w-6xl">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <Check className="h-3.5 w-3.5" />
            {t('balanceDepleted.step1', 'Document Ready')}
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 font-semibold text-white">
            2
            {t('balanceDepleted.step2', 'Choose Plan')}
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            3
            {t('balanceDepleted.step3', 'Payment')}
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            4
            {t('balanceDepleted.step4', 'Download')}
          </span>
        </div>

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t('balanceDepleted.title', 'Choose a Plan to Download Your Document')}
          </h1>
          <p className="mx-auto max-w-lg text-slate-500 dark:text-slate-400">
            {t('balanceDepleted.subtitle', 'Your free credits have been used up. Select a plan below to continue.')}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* Plans */}
          <div className="space-y-4">
            {PLANS.map((plan) => {
              const price = getPrice(plan);
              const isSelected = selectedPlan === plan.id;
              const isLoading = loadingPlan === plan.id;

              return (
                <button
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isLoading}
                  className={`relative w-full rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50 shadow-md dark:border-violet-500 dark:bg-violet-950/30'
                      : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-700'
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}>
                      {plan.badge}
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${plan.gradientFrom} ${plan.gradientTo} text-white`}>
                        {plan.icon}
                      </div>
                      <div>
                        <p className={`font-bold ${plan.color}`}>{plan.name}</p>
                        <p className="text-xs text-slate-400">
                          {plan.credits === 0
                            ? t('balanceDepleted.unlimited', 'Unlimited')
                            : `${plan.credits} ${t('balanceDepleted.credits', 'credits')}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-end gap-1">
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                          ${price}
                        </span>
                        <span className="mb-0.5 text-xs text-slate-400">/mo</span>
                      </div>
                      {billing === 'yearly' && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          ${((price * 12)).toFixed(0)}/yr
                        </p>
                      )}
                    </div>
                  </div>

                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Billing Toggle */}
            <div className="mt-4 flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  billing === 'monthly'
                    ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {t('balanceDepleted.monthly', 'Monthly')}
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  billing === 'yearly'
                    ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {t('balanceDepleted.yearly', 'Yearly')}
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* Features + Document Preview */}
          <div className="space-y-6">
            {/* Document Preview Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                  <FileText className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {t('balanceDepleted.documentReady', 'Your document is ready!')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t('balanceDepleted.documentReadyDesc', 'Complete payment to download')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-8 dark:from-violet-950/30 dark:to-indigo-950/30">
                <div className="relative">
                  <div className="h-32 w-24 rounded-lg bg-violet-400 shadow-lg">
                    <div className="absolute right-0 top-0 h-8 w-8 rounded-bl-lg bg-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 rounded-lg bg-orange-500 px-2 py-1 text-xs font-bold text-white shadow">
                    PDF
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {t('balanceDepleted.readyToDownload', 'Ready to download!')}
                </span>
              </div>
            </div>

            {/* Features List */}
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
                >
                  <span className="mt-0.5 text-violet-500">{feature.icon}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{feature.label}</span>
                </div>
              ))}
            </div>

            {/* Back to tools */}
            <div className="text-center">
              <Link
                to={returnUrl}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400"
              >
                <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                {t('balanceDepleted.backToTools', 'Back to tools')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
