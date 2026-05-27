import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { ArrowRight, Check, CreditCard, FileText, Loader2, Lock, Shield, Wallet } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getApiClient } from '@/services/api';
import { toast } from 'sonner';

const api = getApiClient();

type PaymentMethod = 'paypal' | 'paymob' | 'stripe';

interface SubscriptionStatusResponse {
  pricing?: {
    monthly_plan_id?: string | null;
    yearly_plan_id?: string | null;
    monthly_price_id?: string | null;
    yearly_price_id?: string | null;
    paymob_plans?: Record<string, number> | null;
  };
  payment_methods?: Array<{
    id: PaymentMethod;
    enabled: boolean;
    supports_plans?: string[];
  }>;
}

interface ResolvedMethodState {
  id: PaymentMethod;
  enabled: boolean;
  selectable: boolean;
  reason?: string;
}

const PLAN_INFO: Record<string, { name: string; credits: number }> = {
  starter: { name: 'Starter', credits: 200 },
  pro: { name: 'Pro', credits: 1000 },
  business: { name: 'Business', credits: 0 },
};

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 4.99, yearly: 3.99 },
  pro: { monthly: 9.99, yearly: 7.99 },
  business: { monthly: 29.99, yearly: 24.99 },
};

const METHOD_PLAN_SUPPORT: Record<PaymentMethod, string[]> = {
  paypal: ['starter', 'pro', 'business'],
  paymob: ['starter', 'pro', 'business'],
  stripe: ['pro'],
};

const FEATURES_LIST = [
  { icon: <CreditCard className="h-4 w-4" />, label: 'Unlimited edits' },
  { icon: <FileText className="h-4 w-4" />, label: 'Unlimited downloads' },
  { icon: <Lock className="h-4 w-4" />, label: 'Sign documents online' },
  { icon: <Shield className="h-4 w-4" />, label: 'Convert to any format' },
];

export function resolvePaymentMethods(
  plan: string,
  availability: Record<PaymentMethod, boolean>
): ResolvedMethodState[] {
  return (['paypal', 'paymob', 'stripe'] as PaymentMethod[]).map((id) => {
    const enabled = availability[id];
    const supportsPlan = METHOD_PLAN_SUPPORT[id].includes(plan);
    const selectable = enabled && supportsPlan;

    let reason: string | undefined;
    if (!enabled) {
      reason = 'Unavailable right now';
    } else if (!supportsPlan) {
      reason = 'Not available for this plan';
    }

    return { id, enabled, selectable, reason };
  });
}

export default function PaymentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.initialized);
  const authLoading = useAuthStore((s) => s.isLoading);

  const rawPlan = (searchParams.get('plan') || 'starter').toLowerCase();
  const plan = Object.prototype.hasOwnProperty.call(PLAN_INFO, rawPlan) ? rawPlan : 'starter';
  const rawBilling = (searchParams.get('billing') || 'yearly').toLowerCase();
  const billing = rawBilling === 'monthly' ? 'monthly' : 'yearly';
  const returnUrl = searchParams.get('return') || '/account';

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('paypal');
  const [processing, setProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [methodAvailability, setMethodAvailability] = useState<Record<PaymentMethod, boolean>>({
    paypal: false,
    paymob: false,
    stripe: false,
  });

  const planData = PLAN_INFO[plan];
  const prices = PLAN_PRICES[plan];
  const price = billing === 'yearly' ? prices.yearly : prices.monthly;

  const resolvedMethods = useMemo(
    () => resolvePaymentMethods(plan, methodAvailability),
    [plan, methodAvailability]
  );
  const hasSelectableMethod = resolvedMethods.some((method) => method.selectable);

  useEffect(() => {
    if (!authInitialized) {
      return;
    }
    if (!user) {
      const accountQuery = new URLSearchParams({
        redirect: 'payment',
        plan,
        billing,
      });
      if (returnUrl && returnUrl !== '/account') {
        accountQuery.set('return', returnUrl);
      }
      navigate(`/account?${accountQuery.toString()}`);
    }
  }, [user, authInitialized, navigate, plan, billing, returnUrl]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadPaymentAvailability = async () => {
      setLoadingMethods(true);
      try {
        const { data } = await api.get<SubscriptionStatusResponse>('account/subscription');
        const pricing = data?.pricing ?? {};

        const fallbackAvailability: Record<PaymentMethod, boolean> = {
          paypal: Boolean(pricing.monthly_plan_id || pricing.yearly_plan_id),
          stripe: Boolean(pricing.monthly_price_id || pricing.yearly_price_id),
          paymob: Boolean(pricing.paymob_plans && Object.keys(pricing.paymob_plans).length > 0),
        };

        const resolvedAvailability = { ...fallbackAvailability };
        if (Array.isArray(data?.payment_methods)) {
          for (const method of data.payment_methods) {
            resolvedAvailability[method.id] = Boolean(method.enabled);
          }
        }

        if (!cancelled) {
          setMethodAvailability(resolvedAvailability);
        }
      } catch {
        if (!cancelled) {
          setMethodAvailability({ paypal: false, paymob: false, stripe: false });
        }
      } finally {
        if (!cancelled) {
          setLoadingMethods(false);
        }
      }
    };

    void loadPaymentAvailability();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const activeMethod = resolvedMethods.find((method) => method.id === selectedMethod);
    if (activeMethod?.selectable) return;

    const firstSelectable = resolvedMethods.find((method) => method.selectable);
    if (firstSelectable) {
      setSelectedMethod(firstSelectable.id);
    }
  }, [resolvedMethods, selectedMethod]);

  const handlePayPal = useCallback(async () => {
    setProcessing(true);
    try {
      const { data } = await api.post('paypal/create-subscription', { plan, billing });
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(t('payment.errorGeneric'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg || t('payment.errorGeneric'));
    } finally {
      setProcessing(false);
    }
  }, [plan, billing, t]);

  const handlePayMob = useCallback(async () => {
    setProcessing(true);
    try {
      const { data } = await api.post('paymob/create-intention', { plan, billing });
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(t('payment.errorGeneric'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg || t('payment.errorGeneric'));
    } finally {
      setProcessing(false);
    }
  }, [plan, billing, t]);

  const handleStripe = useCallback(async () => {
    setProcessing(true);
    try {
      const { data } = await api.post('stripe/create-checkout-session', { plan, billing });
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(t('payment.errorGeneric'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg || t('payment.errorGeneric'));
    } finally {
      setProcessing(false);
    }
  }, [plan, billing, t]);

  const handleSubmit = () => {
    if (!agreedToTerms) {
      toast.error(t('payment.agreeToTerms'));
      return;
    }

    const activeMethod = resolvedMethods.find((method) => method.id === selectedMethod);
    if (!activeMethod || !activeMethod.selectable) {
      toast.error(activeMethod?.reason || t('payment.methodUnavailable', 'Selected payment method is unavailable.'));
      return;
    }

    switch (selectedMethod) {
      case 'paypal':
        void handlePayPal();
        break;
      case 'paymob':
        void handlePayMob();
        break;
      case 'stripe':
        void handleStripe();
        break;
    }
  };

  if (!authInitialized || authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400" />
      </div>
    );
  }

  const isRTL = i18n.dir() === 'rtl';
  const methodUI = {
    paypal: { label: 'PayPal', icon: <Wallet className="h-5 w-5" /> },
    paymob: { label: 'PayMob', icon: <CreditCard className="h-5 w-5" /> },
    stripe: { label: 'Stripe', icon: <CreditCard className="h-5 w-5" /> },
  } as const;

  return (
    <>
      <SEOHead
        title={t('payment.metaTitle', 'Complete Payment — Dociva')}
        description={t('payment.metaDesc', 'Complete your payment to download your document.')}
        path="/payment"
      />

      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <Check className="h-3.5 w-3.5" />
            {t('payment.step1', 'Document Ready')}
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <Check className="h-3.5 w-3.5" />
            {t('payment.step2', 'Plan Selected')}
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 font-semibold text-white">
            3
            {t('payment.step3', 'Payment')}
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            4
            {t('payment.step4', 'Download')}
          </span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('payment.title', 'Final Step to Get Your Document')}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4">
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {t('payment.totalDue', 'Total Due Now:')}{' '}
                <span className="text-violet-600 dark:text-violet-400">${price}</span>
              </p>
            </div>

            <div className="mb-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-6 dark:from-violet-950/30 dark:to-indigo-950/30">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="h-28 w-20 rounded-lg bg-violet-400 shadow-lg">
                    <div className="absolute right-0 top-0 h-6 w-6 rounded-bl-lg bg-white" />
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                    PDF
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {t('payment.readyToDownload', 'Ready to download!')}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{planData.name}</p>
                  <p className="text-xs text-slate-400">
                    {planData.credits === 0
                      ? t('payment.unlimited', 'Unlimited credits')
                      : `${planData.credits} ${t('payment.credits', 'credits')}`}
                  </p>
                </div>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {billing === 'yearly' ? t('payment.yearly', 'Yearly') : t('payment.monthly', 'Monthly')}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {FEATURES_LIST.map((feature) => (
                <div key={feature.label} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-violet-500">{feature.icon}</span>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">
              {t('payment.quickPayment', 'Quick Payment')}
            </h2>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {resolvedMethods.map((method) => {
                const ui = methodUI[method.id];
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={!method.selectable}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`rounded-xl border p-3 transition-all ${
                      selectedMethod === method.id && method.selectable
                        ? 'border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/30'
                        : 'border-slate-200 dark:border-slate-700'
                    } ${!method.selectable ? 'cursor-not-allowed opacity-60' : 'hover:border-violet-300 dark:hover:border-violet-700'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className={selectedMethod === method.id && method.selectable ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}>
                        {ui.icon}
                      </span>
                      <span className={`text-xs font-semibold ${
                        selectedMethod === method.id && method.selectable
                          ? 'text-violet-700 dark:text-violet-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {ui.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-5 grid gap-1.5">
              {resolvedMethods
                .filter((method) => !method.selectable)
                .map((method) => (
                  <p key={method.id} className="text-xs text-slate-500 dark:text-slate-400">
                    {methodUI[method.id].label}: {method.reason}
                  </p>
                ))}
            </div>

            {!hasSelectableMethod && !loadingMethods && (
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
                {t('payment.noMethodsAvailable', 'No payment method is currently available for this plan. Please choose another plan or try again later.')}
              </div>
            )}

            <div className="mb-5 flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="terms" className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t('payment.termsText', 'By completing this purchase, you agree to the')}{' '}
                <Link to="/terms" className="text-violet-600 hover:underline dark:text-violet-400">
                  {t('payment.termsOfService', 'Terms of Service')}
                </Link>{' '}
                {t('payment.and', 'and')}{' '}
                <Link to="/privacy" className="text-violet-600 hover:underline dark:text-violet-400">
                  {t('payment.privacyPolicy', 'Privacy Policy')}
                </Link>
                . {t('payment.termsDesc', 'You can cancel your subscription at any time from your account page.')}
              </label>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={processing || loadingMethods || !agreedToTerms || !hasSelectableMethod}
              className="btn-success w-full py-3 text-base font-bold disabled:opacity-60"
            >
              {processing || loadingMethods ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Lock className="mr-2 inline h-4 w-4" />
                  {t('payment.payAndDownload', 'Pay & Download Document')}
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>{t('payment.securedBy', 'This is a secure 128-bit encrypted payment')}</span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Shield className="h-3 w-3 text-slate-400" />
              <span>{t('payment.nortonBadge', 'Secured by industry-standard encryption')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to={returnUrl}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400"
          >
            <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t('payment.backToTools', 'Back to tools')}
          </Link>
        </div>
      </div>
    </>
  );
}
