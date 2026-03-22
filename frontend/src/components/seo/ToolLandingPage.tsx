import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { getToolSEO } from '@/config/seoData';
import { buildLanguageAlternates, buildSocialImageUrl, generateToolSchema, generateBreadcrumbs, generateFAQ, generateHowTo, getOgLocale, getSiteOrigin } from '@/utils/seo';
import BreadcrumbNav from './BreadcrumbNav';
import FAQSection from './FAQSection';
import RelatedTools from './RelatedTools';
import SuggestedTools from './SuggestedTools';
import ToolRating from '@/components/shared/ToolRating';
import SharePanel from '@/components/shared/SharePanel';
import ToolWorkflowPanel from '@/components/shared/ToolWorkflowPanel';
import { useToolRating } from '@/hooks/useToolRating';
import { dispatchRatingPrompt } from '@/utils/ratingPrompt';

interface SEOFAQ {
  q: string;
  a: string;
}

interface ToolLandingPageProps {
  /** The tool slug matching seoData.ts entries */
  slug: string;
  /** The actual tool component rendered inside the landing page */
  children: React.ReactNode;
}

/**
 * SEO wrapper that adds structured data, FAQ section, related tools,
 * feature bullets, and proper meta tags around any tool component.
 */
export default function ToolLandingPage({ slug, children }: ToolLandingPageProps) {
  const { t, i18n } = useTranslation();
  const seo = getToolSEO(slug);
  const ratingData = useToolRating(slug);

  // Fallback: just render tool without SEO wrapper
  if (!seo) return <>{children}</>;

  const toolTitle = t(`tools.${seo.i18nKey}.title`);
  const toolDesc = t(`tools.${seo.i18nKey}.description`);
  const origin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const path = `/tools/${slug}`;
  const canonicalUrl = `${origin}${path}`;
  const socialImageUrl = buildSocialImageUrl(origin);
  const languageAlternates = buildLanguageAlternates(origin, path);
  const currentOgLocale = getOgLocale(i18n.language);

  const toolSchema = generateToolSchema({
    name: toolTitle,
    description: seo.metaDescription,
    url: canonicalUrl,
    category: seo.category === 'PDF' ? 'UtilitiesApplication' : 'WebApplication',
    ratingValue: ratingData.average,
    ratingCount: ratingData.count,
  });

  const breadcrumbSchema = generateBreadcrumbs([
    { name: t('common.appName'), url: origin },
    { name: seo.category, url: `${origin}/#${seo.category.toLowerCase()}` },
    { name: toolTitle, url: canonicalUrl },
  ]);

  const faqSchema = seo.faqs.length > 0 ? generateFAQ(seo.faqs) : null;
  const howToSteps = t(`seo.${seo.i18nKey}.howToUse`, { returnObjects: true }) as string[];
  const howToSchema = Array.isArray(howToSteps) && howToSteps.length > 0
    ? generateHowTo({
        name: toolTitle,
        description: seo.metaDescription,
        steps: howToSteps,
        url: canonicalUrl,
      })
    : null;

  return (
    <>
      <Helmet>
        <title>{toolTitle} — {seo.titleSuffix} | {t('common.appName')}</title>
        <meta name="description" content={seo.metaDescription} />
        <meta name="keywords" content={seo.keywords} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        {languageAlternates.map((alternate) => (
          <link
            key={alternate.hrefLang}
            rel="alternate"
            hrefLang={alternate.hrefLang}
            href={alternate.href}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={`${toolTitle} — ${seo.titleSuffix}`} />
        <meta property="og:description" content={seo.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={socialImageUrl} />
        <meta property="og:image:alt" content={`${toolTitle} social preview`} />
        <meta property="og:locale" content={currentOgLocale} />
        {languageAlternates
          .filter((alternate) => alternate.ogLocale !== currentOgLocale)
          .map((alternate) => (
            <meta key={alternate.ogLocale} property="og:locale:alternate" content={alternate.ogLocale} />
          ))}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${toolTitle} — ${seo.titleSuffix}`} />
        <meta name="twitter:description" content={seo.metaDescription} />
        <meta name="twitter:image" content={socialImageUrl} />
        <meta name="twitter:image:alt" content={`${toolTitle} social preview`} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(toolSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
        {howToSchema && (
          <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        )}
      </Helmet>

      {/* Tool Interface */}
      <div className="mx-auto mb-6 max-w-5xl px-4">
        <BreadcrumbNav
          items={[
            { label: t('common.home'), to: '/' },
            { label: toolTitle },
          ]}
        />
      </div>
      {children}

      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-start justify-center gap-3 px-4">
        <SharePanel
          variant="page"
          title={toolTitle}
          text={toolDesc}
          url={canonicalUrl}
        />

        <button
          type="button"
          onClick={() => dispatchRatingPrompt(slug, { forceOpen: true })}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-600 dark:hover:text-primary-300"
        >
          <span>{t('pages.rating.cta', 'Rate this tool')}</span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="text-slate-500 dark:text-slate-400">
            {t('pages.rating.ctaHint', 'Help us improve it faster')}
          </span>
        </button>
      </div>

      {/* SEO Content Below Tool */}
      <div className="deferred-section mx-auto mt-16 max-w-3xl">
        <ToolWorkflowPanel />

        {/* What this tool does */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
            {t('seo.headings.whatItDoes')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {t(`seo.${seo.i18nKey}.whatItDoes`)}
          </p>
        </section>

        {/* How to use */}
        {(() => {
          const steps = t(`seo.${seo.i18nKey}.howToUse`, { returnObjects: true }) as string[];
          return Array.isArray(steps) && steps.length > 0 ? (
            <section className="mb-12">
              <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
                {t('seo.headings.howToUse')}
              </h2>
              <ol className="list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
                {steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </section>
          ) : null;
        })()}

        {/* Benefits */}
        {(() => {
          const benefits = t(`seo.${seo.i18nKey}.benefits`, { returnObjects: true }) as string[];
          return Array.isArray(benefits) && benefits.length > 0 ? (
            <section className="mb-12">
              <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
                {t('seo.headings.whyUse', { tool: toolTitle })}
              </h2>
              <ul className="space-y-3">
                {benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null;
        })()}

        {/* Common use cases */}
        {(() => {
          const useCases = t(`seo.${seo.i18nKey}.useCases`, { returnObjects: true }) as string[];
          return Array.isArray(useCases) && useCases.length > 0 ? (
            <section className="mb-12">
              <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
                {t('seo.headings.useCases')}
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-300">
                {useCases.map((useCase, idx) => (
                  <li key={idx}>{useCase}</li>
                ))}
              </ul>
            </section>
          ) : null;
        })()}

        {/* FAQ Section */}
        {(() => {
          const faqData = t(`seo.${seo.i18nKey}.faq`, { returnObjects: true }) as SEOFAQ[];
          const faqs = Array.isArray(faqData)
            ? faqData.map((f) => ({ question: f.q, answer: f.a }))
            : [];
          return <FAQSection faqs={faqs} />;
        })()}

        {/* Related Tools */}
        <RelatedTools currentSlug={slug} />
        <SuggestedTools currentSlug={slug} limit={4} />

        {/* User Rating */}
        <ToolRating toolSlug={slug} />
      </div>
    </>
  );
}
