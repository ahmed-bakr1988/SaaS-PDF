import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, XCircle, MinusCircle, ArrowRight, Swords, Trophy, ExternalLink } from 'lucide-react';
import { getComparisonPage, getComparisonPagesByTool, type ComparisonFeature } from '@/config/comparisonData';
import { getToolSEO } from '@/config/seoData';
import { getSiteOrigin, buildSocialImageUrl, getOgLocale, generateWebPage, generateFAQ } from '@/utils/seo';

function FeatureIcon({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (value === 'partial') return <MinusCircle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-400" />;
}

function FeatureLabel({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <span className="sr-only">Yes</span>;
  if (value === 'partial') return <span className="sr-only">Partial</span>;
  return <span className="sr-only">No</span>;
}

export default function ComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();

  const comparison = slug ? getComparisonPage(slug) : undefined;

  if (!comparison) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('pages.comparison.notFound')}
        </h1>
        <Link to="/tools" className="mt-4 inline-block text-primary-600 hover:underline">
          {t('pages.comparison.browseTools')}
        </Link>
      </div>
    );
  }

  const ourTool = getToolSEO(comparison.ourToolSlug);
  const origin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const canonicalUrl = `${origin}/compare/${comparison.slug}`;
  const socialImageUrl = buildSocialImageUrl(origin);
  const currentOgLocale = getOgLocale(i18n.language);
  const prefix = `pages.comparison.${comparison.i18nKey}`;

  const title = t(`${prefix}.title`);
  const metaDescription = t(`${prefix}.metaDescription`);

  const faqItems = t(`${prefix}.faqs`, { returnObjects: true }) as Array<{ q: string; a: string }>;
  const faqs = Array.isArray(faqItems) ? faqItems : [];

  const webPageSchema = generateWebPage({
    name: title,
    description: metaDescription,
    url: canonicalUrl,
  });

  const faqSchema = faqs.length > 0
    ? generateFAQ(faqs.map((f) => ({ question: f.q, answer: f.a })))
    : null;

  // Related comparisons
  const relatedComparisons = comparison.relatedComparisonSlugs
    .map((s) => getComparisonPage(s))
    .filter(Boolean);

  // Related tools
  const relatedTools = comparison.relatedToolSlugs
    .map((s) => getToolSEO(s))
    .filter(Boolean);

  return (
    <>
      <Helmet>
        <title>{title} | {t('common.appName')}</title>
        <meta name="description" content={metaDescription} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={socialImageUrl} />
        <meta property="og:locale" content={currentOgLocale} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={metaDescription} />
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
      </Helmet>

      <div className="mx-auto max-w-4xl px-4">
        {/* Hero */}
        <section className="mb-12 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            <Swords className="h-4 w-4" />
            {t('pages.comparison.badge')}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            {t(`${prefix}.heading`)}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {t(`${prefix}.subtitle`)}
          </p>
        </section>

        {/* Feature Comparison Table */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
            {t('pages.comparison.featureComparison')}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t('pages.comparison.feature')}
              </div>
              <div className="text-center text-sm font-semibold text-primary-700 dark:text-primary-400">
                {t('common.appName')}
              </div>
              <div className="text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                {comparison.competitorName}
              </div>
            </div>

            {/* Feature rows */}
            {comparison.features.map((feature: ComparisonFeature, idx: number) => (
              <div
                key={feature.key}
                className={`grid grid-cols-3 items-center px-4 py-3 ${
                  idx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {t(`pages.comparison.features.${feature.key}`)}
                </div>
                <div className="flex items-center justify-center">
                  <FeatureIcon value={feature.us} />
                  <FeatureLabel value={feature.us} />
                </div>
                <div className="flex items-center justify-center">
                  <FeatureIcon value={feature.competitor} />
                  <FeatureLabel value={feature.competitor} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Our Advantages */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
            <Trophy className="mr-2 inline-block h-5 w-5 text-amber-500" />
            {t(`${prefix}.advantagesTitle`)}
          </h2>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-800/40 dark:bg-green-900/10">
            {(() => {
              const advantages = t(`${prefix}.advantages`, { returnObjects: true }) as string[];
              return Array.isArray(advantages) ? (
                <ul className="space-y-3">
                  {advantages.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                      <span className="text-slate-700 dark:text-slate-300">{adv}</span>
                    </li>
                  ))}
                </ul>
              ) : null;
            })()}
          </div>
        </section>

        {/* Verdict */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
            {t('pages.comparison.verdictTitle')}
          </h2>
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 dark:border-primary-800/40 dark:bg-primary-900/10">
            <p className="text-slate-700 dark:text-slate-300">
              {t(`${prefix}.verdict`)}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12 text-center">
          <Link
            to={`/tools/${comparison.ourToolSlug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            {ourTool ? t(`tools.${ourTool.i18nKey}.title`) : comparison.ourToolSlug}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {t('pages.comparison.ctaSubtext')}
          </p>
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
              {t('pages.comparison.faqTitle')}
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="group rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {faq.q}
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related Comparisons */}
        {relatedComparisons.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
              {t('pages.comparison.relatedComparisons')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedComparisons.map((comp) => (
                <Link
                  key={comp!.slug}
                  to={`/compare/${comp!.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-600"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary-500" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-primary-600 dark:text-slate-300 dark:group-hover:text-primary-400">
                    {t(`pages.comparison.${comp!.i18nKey}.heading`)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
              {t('pages.comparison.relatedTools')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedTools.map((tool) => (
                <Link
                  key={tool!.slug}
                  to={`/tools/${tool!.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-600"
                >
                  <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 dark:text-slate-200 dark:group-hover:text-primary-400">
                    {t(`tools.${tool!.i18nKey}.title`)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {t(`tools.${tool!.i18nKey}.shortDesc`)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
