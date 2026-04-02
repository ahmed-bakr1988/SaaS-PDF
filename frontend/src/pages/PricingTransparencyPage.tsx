import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Coins,
  Gauge,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';

export default function PricingTransparencyPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <>
      <SEOHead
        title={t('pages.pricingTransparency.metaTitle')}
        description={t('pages.pricingTransparency.metaDescription')}
        path="/pricing-transparency"
        jsonLd={generateWebPage({
          name: t('pages.pricingTransparency.metaTitle'),
          description: t('pages.pricingTransparency.metaDescription'),
          url: `${siteOrigin}/pricing-transparency`,
        })}
      />

      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-10">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            {t('pages.pricingTransparency.badge')}
          </span>
          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t('pages.pricingTransparency.title')}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
            {t('pages.pricingTransparency.subtitle')}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <Coins className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.creditsTitle')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.creditsBody')}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <Receipt className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.quoteTitle')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.quoteBody')}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <Scale className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.fairnessTitle')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.fairnessBody')}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <Gauge className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.howTitle')}
              </h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
              {t('pages.pricingTransparency.howBody')}
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('pages.pricingTransparency.fixedTitle')}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {t('pages.pricingTransparency.fixedBody')}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('pages.pricingTransparency.dynamicTitle')}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {t('pages.pricingTransparency.dynamicBody')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.noteTitle')}
              </h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
              {t('pages.pricingTransparency.noteBody')}
            </p>
            <div className="mt-6 rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/20">
              <p className="text-sm leading-6 text-primary-800 dark:text-primary-200">
                {t('pages.pricingTransparency.noOneToOneBody')}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('pages.pricingTransparency.examplesTitle')}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.exampleLightTitle')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.exampleLightBody')}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.exampleHeavyTitle')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.exampleHeavyBody')}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.exampleAiTitle')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.exampleAiBody')}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('pages.pricingTransparency.futureTitle')}
            </h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
            {t('pages.pricingTransparency.futureBody')}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.faq1q')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.faq1a')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.faq2q')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.faq2a')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('pages.pricingTransparency.faq3q')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t('pages.pricingTransparency.faq3a')}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {t('pages.pricingTransparency.pricingCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/tools"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('pages.pricingTransparency.toolsCta')}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}