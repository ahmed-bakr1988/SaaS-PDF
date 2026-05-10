import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import {
  ArrowRight, Check, X, Zap, Crown, Building2,
  Sparkles, Shield, Clock, Star, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import SocialProofStrip from '@/components/shared/SocialProofStrip';
import { getApiClient } from '@/services/api';

const api = getApiClient();

// ─── Plan definitions ────────────────────────────────────────────────────────

interface Plan {
  id: 'free' | 'starter' | 'pro' | 'business';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  badge?: string;
  highlight?: boolean;
  ctaLabel: string;
  ctaAction: 'signup' | 'starter' | 'pro' | 'business' | 'contact';
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
}

// ─── Feature comparison table ─────────────────────────────────────────────────

interface Feature {
  category: string;
  items: {
    label: string;
    free: string | boolean;
    starter: string | boolean;
    pro: string | boolean;
    business: string | boolean;
  }[];
}

const FEATURE_SECTIONS: Feature[] = [
  {
    category: 'Usage Limits',
    items: [
      { label: 'Daily operations', free: '5 / day', starter: '100 / day', pro: 'Unlimited', business: 'Unlimited' },
      { label: 'Max file size', free: '25 MB', starter: '250 MB', pro: '1 GB', business: '2 GB' },
      { label: 'File history', free: '10 files', starter: '100 files', pro: 'Unlimited', business: 'Unlimited' },
      { label: 'Batch processing', free: false, starter: '5 files', pro: '20 files', business: '50 files' },
      { label: 'Credits / 30 days', free: '50 credits', starter: '200 credits', pro: '1,000 credits', business: 'Unlimited' },
    ],
  },
  {
    category: 'PDF Tools',
    items: [
      { label: 'All basic PDF tools', free: true, starter: true, pro: true, business: true },
      { label: 'PDF Editor', free: true, starter: true, pro: true, business: true },
      { label: 'PDF Compress', free: true, starter: true, pro: true, business: true },
      { label: 'OCR (text extraction)', free: true, starter: true, pro: true, business: true },
      { label: 'Advanced Arabic OCR', free: false, starter: false, pro: true, business: true },
    ],
  },
  {
    category: 'AI Features',
    items: [
      { label: 'AI PDF Chat', free: false, starter: true, pro: true, business: true },
      { label: 'AI Summarization', free: false, starter: true, pro: true, business: true },
      { label: 'AI Translation', free: false, starter: false, pro: true, business: true },
      { label: 'Smart Compression', free: false, starter: false, pro: true, business: true },
    ],
  },
  {
    category: 'Platform',
    items: [
      { label: 'No advertisements', free: false, starter: true, pro: true, business: true },
      { label: 'Priority processing queue', free: false, starter: false, pro: true, business: true },
      { label: 'Email delivery of results', free: false, starter: true, pro: true, business: true },
      { label: 'API access', free: false, starter: false, pro: true, business: true },
      { label: 'Team workspace', free: false, starter: false, pro: false, business: true },
      { label: 'White-label branding', free: false, starter: false, pro: false, business: true },
      { label: 'SLA support', free: false, starter: false, pro: false, business: true },
    ],
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is the Free plan really free forever?',
    a: 'Yes! All core tools are available for free with daily limits. No credit card required. Upgrade anytime for more power.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Absolutely. Cancel anytime with one click from your account page. No questions asked, no cancellation fees. Your account reverts to the Free plan immediately.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards, as well as PayPal. Payments are processed securely — we never store your card details.',
  },
  {
    q: 'Does the Pro plan include a free trial?',
    a: 'Yes! Pro includes a 2-day free trial for first-time subscribers. Cancel before the trial ends and you won\'t be charged a penny.',
  },
  {
    q: 'What happens to my files after processing?',
    a: 'Files are automatically deleted from our servers after 30 minutes for Free users, and retained in your history according to your plan limits.',
  },
  {
    q: 'Do you support Arabic PDF processing?',
    a: 'Yes! Our OCR and AI tools support Arabic text with high accuracy. Advanced Arabic OCR is available on the Pro and Business plans.',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const user = useAuthStore((s) => s.user);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showFullTable, setShowFullTable] = useState(false);

  const yearlyDiscount = 20; // %

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: 'Perfect for occasional use. No credit card needed.',
      ctaLabel: user ? 'Your current plan' : 'Get started free',
      ctaAction: 'signup',
      color: 'text-slate-600 dark:text-slate-300',
      gradientFrom: 'from-slate-100',
      gradientTo: 'to-slate-50',
      icon: <Zap className="h-5 w-5" />,
    },
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 4.99,
      yearlyPrice: 3.99,
      description: 'Great for individuals who work with PDFs regularly.',
      badge: 'Best Value',
      ctaLabel: 'Get Starter',
      ctaAction: 'starter',
      color: 'text-emerald-600 dark:text-emerald-400',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-400',
      icon: <Star className="h-5 w-5" />,
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 9.99,
      yearlyPrice: 7.99,
      description: 'Unlimited power with AI features for power users.',
      badge: 'Most Popular',
      highlight: true,
      ctaLabel: 'Start Free Trial',
      ctaAction: 'pro',
      color: 'text-violet-600 dark:text-violet-400',
      gradientFrom: 'from-violet-600',
      gradientTo: 'to-indigo-500',
      icon: <Crown className="h-5 w-5" />,
    },
    {
      id: 'business',
      name: 'Business',
      monthlyPrice: 29.99,
      yearlyPrice: 24.99,
      description: 'Teams, API access, white-label & priority support.',
      ctaLabel: 'Contact Sales',
      ctaAction: 'contact',
      color: 'text-amber-600 dark:text-amber-400',
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-orange-400',
      icon: <Building2 className="h-5 w-5" />,
    },
  ];

  async function handleCta(plan: Plan) {
    if (plan.ctaAction === 'signup') {
      window.location.href = user ? '/' : '/account?redirect=pricing';
      return;
    }
    if (plan.ctaAction === 'contact') {
      window.location.href = '/contact?subject=Business+Plan';
      return;
    }
    if (!user) {
      window.location.href = `/account?redirect=pricing&plan=${plan.id}`;
      return;
    }
    if (user.plan === plan.id) return;

    setLoadingPlan(plan.id);
    try {
      await api.post('internal/admin/plan-interest/record', { plan: plan.id, billing }).catch(() => {});
      const { data } = await api.post('paypal/create-subscription', { plan: plan.id, billing });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      alert(msg || 'Payment system is being set up. Please try again later.');
    } finally {
      setLoadingPlan(null);
    }
  }

  function getPrice(plan: Plan) {
    return billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  }

  function renderCellValue(val: string | boolean) {
    if (val === true) return <Check className="mx-auto h-4 w-4 text-emerald-500" />;
    if (val === false) return <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600" />;
    return <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>;
  }

  const currentUserPlan = user?.plan === 'micro' ? 'starter' : (user?.plan ?? 'free');

  return (
    <>
      <SEOHead
        title="Pricing — Dociva PDF Tools"
        description="Compare Free, Starter ($4.99), Pro ($9.99), and Business ($29.99) plans for Dociva. Unlimited PDF processing, AI features, OCR, and more."
        path="/pricing"
        jsonLd={generateWebPage({
          name: 'Pricing',
          description: 'Compare plans for Dociva — the professional PDF processing platform.',
          url: `${siteOrigin}/pricing`,
        })}
      />

      <div className="mx-auto max-w-7xl space-y-20">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
            Simple, transparent pricing
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Choose your plan
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-500 dark:text-slate-400">
            Start free, upgrade when you need more. All plans include 32+ PDF tools.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                billing === 'monthly'
                  ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                billing === 'yearly'
                  ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Yearly
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                -{yearlyDiscount}%
              </span>
            </button>
          </div>
        </div>

        {/* ── Plan cards ───────────────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = getPrice(plan);
            const isCurrentPlan = currentUserPlan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-shadow dark:bg-slate-800 ${
                  plan.highlight
                    ? 'border-violet-500 shadow-xl shadow-violet-100 dark:border-violet-500 dark:shadow-violet-900/20'
                    : 'border-slate-200 shadow-sm hover:shadow-md dark:border-slate-700'
                }`}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold text-white ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${plan.gradientFrom} ${plan.gradientTo} text-white`}>
                  {plan.icon}
                </div>
                <h2 className={`text-lg font-bold ${plan.color}`}>{plan.name}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 min-h-[2.5rem]">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mt-4 mb-6">
                  {price === 0 ? (
                    <div className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      Free
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                          ${price}
                        </span>
                        <span className="mb-1 text-sm text-slate-400">/mo</span>
                      </div>
                      {billing === 'yearly' && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Billed ${(price * 12).toFixed(0)}/year
                          <span className="ml-1 line-through text-slate-400">${(plan.monthlyPrice * 12).toFixed(0)}</span>
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* CTA button */}
                <button
                  onClick={() => handleCta(plan)}
                  disabled={isLoading || isCurrentPlan}
                  className={`mb-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 focus:ring-violet-500 dark:shadow-violet-900/30'
                      : plan.id === 'free'
                      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                      : plan.id === 'starter'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-100 hover:shadow-emerald-200 focus:ring-emerald-500 dark:shadow-emerald-900/20'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400 text-white shadow-lg shadow-amber-100 hover:shadow-amber-200 focus:ring-amber-500 dark:shadow-amber-900/20'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : isCurrentPlan ? (
                    'Current Plan ✓'
                  ) : (
                    plan.ctaLabel
                  )}
                </button>

                {/* Key features */}
                <ul className="flex-1 space-y-2.5">
                  {FEATURE_SECTIONS.flatMap((s) => s.items)
                    .filter((f) => {
                      const val = f[plan.id as keyof typeof f];
                      return val !== false;
                    })
                    .slice(0, 6)
                    .map((f) => {
                      const val = f[plan.id as keyof typeof f];
                      return (
                        <li key={f.label} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span>
                            {f.label}
                            {typeof val === 'string' && (
                              <span className="ml-1 text-xs text-slate-400">({val})</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* ── Social proof strip ───────────────────────────────────────── */}
        <SocialProofStrip />

        {/* ── Feature comparison table ─────────────────────────────────── */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Full feature comparison
            </h2>
            <button
              onClick={() => setShowFullTable((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {showFullTable ? (
                <><ChevronUp className="h-4 w-4" /> Show less</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> Show all features</>
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 w-2/5">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="px-4 py-4 text-center font-semibold">
                      <span className={plan.highlight ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}>
                        {plan.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {FEATURE_SECTIONS
                  .slice(0, showFullTable ? undefined : 2)
                  .map((section) => (
                    <>
                      <tr key={section.category} className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td
                          colSpan={5}
                          className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((item) => (
                        <tr
                          key={item.label}
                          className="bg-white transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/30"
                        >
                          <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{item.label}</td>
                          {plans.map((plan) => (
                            <td key={plan.id} className="px-4 py-3 text-center">
                              {renderCellValue(item[plan.id as keyof typeof item] as string | boolean)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Trust signals ────────────────────────────────────────────── */}
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: <Shield className="h-6 w-6 text-violet-500" />,
              title: 'Secure & Private',
              desc: 'Files are encrypted in transit and auto-deleted. We never read your documents.',
            },
            {
              icon: <Zap className="h-6 w-6 text-amber-500" />,
              title: 'Lightning Fast',
              desc: 'Average processing time under 10 seconds for most operations — even large PDFs.',
            },
            {
              icon: <Clock className="h-6 w-6 text-emerald-500" />,
              title: 'Cancel Anytime',
              desc: 'No contracts, no hidden fees. Cancel or downgrade with one click anytime.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-white">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="font-medium text-slate-900 dark:text-white">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="border-t border-slate-100 px-6 py-4 text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA banner ─────────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 p-10 text-center text-white shadow-2xl shadow-violet-200 dark:shadow-violet-900/30">
          <h2 className="text-3xl font-extrabold">Start processing PDFs smarter today</h2>
          <p className="mt-3 text-violet-200">
            Join thousands of users who rely on Dociva every day.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={user ? '/' : '/account'}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-violet-700 shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => handleCta(plans.find((p) => p.id === 'pro')!)}
              disabled={!!loadingPlan || currentUserPlan === 'pro'}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-60"
            >
              {loadingPlan === 'pro' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Crown className="h-4 w-4" />
                  Try Pro free for 2 days
                </>
              )}
            </button>
          </div>
          <p className="mt-4 text-xs text-violet-300">
            No credit card required for the free plan · Cancel anytime
          </p>
        </div>

      </div>
    </>
  );
}
