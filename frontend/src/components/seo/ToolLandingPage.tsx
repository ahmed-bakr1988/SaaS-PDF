import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { getToolSEO } from '@/config/seoData';
import { generateToolSchema, generateBreadcrumbs, generateFAQ } from '@/utils/seo';
import FAQSection from './FAQSection';
import RelatedTools from './RelatedTools';

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
  const { t } = useTranslation();
  const seo = getToolSEO(slug);

  // Fallback: just render tool without SEO wrapper
  if (!seo) return <>{children}</>;

  const toolTitle = t(`tools.${seo.i18nKey}.title`);
  const toolDesc = t(`tools.${seo.i18nKey}.description`);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonicalUrl = `${origin}/tools/${slug}`;

  const toolSchema = generateToolSchema({
    name: toolTitle,
    description: seo.metaDescription,
    url: canonicalUrl,
    category: seo.category === 'PDF' ? 'UtilitiesApplication' : 'WebApplication',
  });

  const breadcrumbSchema = generateBreadcrumbs([
    { name: t('common.appName'), url: origin },
    { name: seo.category, url: `${origin}/#${seo.category.toLowerCase()}` },
    { name: toolTitle, url: canonicalUrl },
  ]);

  const faqSchema = seo.faqs.length > 0 ? generateFAQ(seo.faqs) : null;

  return (
    <>
      <Helmet>
        <title>{toolTitle} — {seo.titleSuffix} | {t('common.appName')}</title>
        <meta name="description" content={seo.metaDescription} />
        <meta name="keywords" content={seo.keywords} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={`${toolTitle} — ${seo.titleSuffix}`} />
        <meta property="og:description" content={seo.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${toolTitle} — ${seo.titleSuffix}`} />
        <meta name="twitter:description" content={seo.metaDescription} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(toolSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
      </Helmet>

      {/* Tool Interface */}
      {children}

      {/* SEO Content Below Tool */}
      <div className="mx-auto mt-16 max-w-3xl">
        {/* Feature bullets */}
        {seo.features.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
              Why Use Our {toolTitle}?
            </h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              {toolDesc}
            </p>
            <ul className="space-y-3">
              {seo.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ Section */}
        <FAQSection faqs={seo.faqs} />

        {/* Related Tools */}
        <RelatedTools currentSlug={slug} />
      </div>
    </>
  );
}
