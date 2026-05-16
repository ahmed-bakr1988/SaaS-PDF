import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { getSiteOrigin } from '@/utils/seo';
import {
  Check, FileText, Shield, CreditCard, Wallet, Loader2,
  ArrowRight, Lock, Info, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getApiClient } from '@/services/api';
import { toast } from 'sonner';

const api = getApiClient();

type PaymentMethod = 'paypal' | 'paymob' | 'stripe';

interface PlanInfo {
  id: string;
  name: string;
  price: number;
  billing: string;
  credits: number;
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

const FEATURES_LIST = [
  { icon: <CreditCard className="h-4 w-4" />, label: 'Unlimited edits' },
  { icon: <FileText className="h-4 w-4" />, label: 'Unlimited downloads' },
  { icon: <Lock className="h-4 w-4" />, label: 'Sign documents online' },
  { icon: <Shield className="h-4 w-4" />, label: 'Convert to any format' },
];

export default function PaymentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('paypal');
  const [processing, setProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [paymobEnabled, setPaymobEnabled] = useState(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [paymobIframeReady, setPaymobIframeReady] = useState(false);
  const [paymobToken, setPaymobToken] = useState<string | null>(null);
  const [paymobIframeId, setPaymobIframeId] = useState<string | null>(null);

  const plan = searchParams.get('plan') || 'starter';
  const billing = searchParams.get('billing') || 'yearly';
  const returnUrl = searchParams.get('return') || '/account';

  const planData = PLAN_INFO[plan] || PLAN_INFO.starter;
  const prices = PLAN_PRICES[plan] || PLAN_PRICES.starter;
  const price = billing === 'yearly' ? prices.yearly : prices.monthly;

  useEffect(() => {
    if (!user) {
      navigate(`/account?redirect=payment&plan=${plan}&billing=${billing}`);
    }
  }, [user, navigate, plan, billing]);

  useEffect(() => {
    const checkPaymentMethods = async () => {
      try {
        const [paymobRes, subRes] = await Promise.allSettled([
          api.get('paymob/config').catch(() => ({ data: { enabled: false } })),
          api.get('account/subscription').catch(() => ({ data: { checkout_enabled: false } })),
        ]);

        if (paymobRes.status === 'fulfilled') {
          setPaymobEnabled(paymobRes.value.data?.enabled ?? false);
        }
        if (subRes.status === 'fulfilled') {
          const pricing = subRes.value.data?.pricing;
          setPaypalEnabled(!!pricing?.monthly_plan_id);
          setStripeEnabled(!!pricing?.monthly_price_id);
        }
      } catch {
        // ignore
      }
    };
    void checkPaymentMethods();
  }, []);

  const handlePayPal = useCallback(async () => {
    if (!agreedToTerms) {
      toast.error(t('payment.agreeToTerms'));
      return;
    }
    setProcessing(true);
    try {
      const { data } = await api.post('paypal/create-subscription', { plan, billing });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg || t('payment.errorGeneric'));
    } finally {
      setProcessing(false);
    }
  }, [agreedToTerms, plan, billing, t]);

  const handlePayMob = useCallback(async () => {
    if (!agreedToTerms) {
      toast.error(t('payment.agreeToTerms'));
      return;
    }
    setProcessing(true);
    try {
      const { data } = await api.post('paymob/create-intention', { plan, billing });
      if (data.url) {
        window.location.href = data.url;
      } else if (data.client_secret) {
        setPaymobToken(data.client_secret);
        setPaymobIframeReady(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg || t('payment.errorGeneric'));
    } finally {
      setProcessing(false);
    }
  }, [agreedToTerms, plan, billing, t]);

  const handleStripe = useCallback(async () => {
    if (!agreedToTerms) {
      toast.error(t('payment.agreeToTerms'));
      return;
    }
    setProcessing(true);
    try {
      const { data } = await api.post('stripe/create-checkout-session', { plan, billing });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg || t('payment.errorGeneric'));
    } finally {
      setProcessing(false);
    }
  }, [agreedToTerms, plan, billing, t]);

  const handleSubmit = () => {
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

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400" />
      </div>
    );
  }

  const isRTL = i18n.dir() === 'rtl';

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode; enabled: boolean }[] = [
    { id: 'paypal', label: 'PayPal', icon: <Wallet className="h-5 w-5" />, enabled: paypalEnabled },
    { id: 'paymob', label: 'PayMob', icon: <CreditCard className="h-5 w-5" />, enabled: paymobEnabled },
    { id: 'stripe', label: 'Stripe', icon: <CreditCard className="h-5 w-5" />, enabled: stripeEnabled },
  ].filter((m) => m.enabled);

  if (paymentMethods.length === 0) {
    paymentMethods.push({ id: 'paypal', label: 'PayPal', icon: <Wallet className="h-5 w-5" />, enabled: true });
  }

  return (
    <>
      <SEOHead
        title={t('payment.metaTitle', 'Complete Payment — Dociva')}
        description={t('payment.metaDesc', 'Complete your payment to download your document.')}
        path="/payment"
      />

      <div className="mx-auto max-w-5xl">
        {/* Progress Steps */}
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

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t('payment.title', 'Final Step to Get Your Document')}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {/* Order Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4">
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {t('payment.totalDue', 'Total Due Now:')} <span className="text-violet-600 dark:text-violet-400">${price}</span>
              </p>
            </div>

            {/* Document Preview */}
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

            {/* Plan Details */}
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

            {/* Features */}
            <div className="mt-4 grid gap-2">
              {FEATURES_LIST.map((feature) => (
                <div key={feature.label} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-violet-500">{feature.icon}</span>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">
              {t('payment.quickPayment', 'Quick Payment')}
            </h2>

            {/* Payment Method Selection */}
            <div className="mb-5 grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                    selectedMethod === method.id
                      ? 'border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/30'
                      : 'border-slate-200 hover:border-violet-300 dark:border-slate-700 dark:hover:border-violet-700'
                  }`}
                >
                  <span className={selectedMethod === method.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}>
                    {method.icon}
                  </span>
                  <span className={`text-xs font-semibold ${
                    selectedMethod === method.id ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {method.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Card Payment Form (for PayMob/Stripe) */}
            {(selectedMethod === 'paymob' || selectedMethod === 'stripe') && !paymobIframeReady && (
              <div className="mb-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('payment.cardNumber', 'Card Number')}
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="XXXX XXXX XXXX XXXX"
                    maxLength={19}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t('payment.expiry', 'MM/YY')}
                    </label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t('payment.cvv', 'CVV')}
                    </label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="CVV"
                      maxLength={4}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('payment.cardName', 'Name on Card')}
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder={t('payment.cardNamePlaceholder', 'Full name as on card')}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* PayMob Iframe */}
            {selectedMethod === 'paymob' && paymobIframeReady && paymobToken && (
              <div className="mb-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('payment.secureCheckout', 'Secure Checkout via PayMob')}
                </p>
                <div className="h-96 overflow-hidden rounded-lg">
                  <iframe
                    src={`https://accept.paymob.com/api/acceptance/iframes/${paymobIframeId}?payment_token=${paymobToken}`}
                    className="h-full w-full border-0"
                    title="PayMob Payment"
                  />
                </div>
              </div>
            )}

            {/* Terms Checkbox */}
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
                .{' '}
                {t('payment.termsDesc', 'You can cancel your subscription at any time from your account page.')}
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={processing || !agreedToTerms}
              className="btn-success w-full py-3 text-base font-bold disabled:opacity-60"
            >
              {processing ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Lock className="mr-2 inline h-4 w-4" />
                  {t('payment.payAndDownload', 'Pay & Download Document')}
                </>
              )}
            </button>

            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>{t('payment.securedBy', 'This is a secure 128-bit encrypted payment')}</span>
            </div>

            {/* Norton Badge Placeholder */}
            <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Shield className="h-3 w-3 text-slate-400" />
              <span>{t('payment.nortonBadge', 'Secured by industry-standard encryption')}</span>
            </div>
          </div>
        </div>

        {/* Back Link */}
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
