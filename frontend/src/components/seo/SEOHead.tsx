import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'SaaS-PDF';

interface SEOHeadProps {
  /** Page title (will be appended with " — SaaS-PDF") */
  title: string;
  /** Meta description */
  description: string;
  /** Canonical URL path (e.g. "/about") — origin is auto-prefixed */
  path: string;
  /** OG type — defaults to "website" */
  type?: string;
  /** Optional JSON-LD objects to inject as structured data */
  jsonLd?: object | object[];
}

/**
 * Reusable SEO head component that injects:
 * - title, description, canonical URL
 * - OpenGraph meta tags (title, description, url, type, site_name, locale)
 * - Twitter card meta tags
 * - Optional JSON-LD structured data
 */
export default function SEOHead({ title, description, path, type = 'website', jsonLd }: SEOHeadProps) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonicalUrl = `${origin}${path}`;
  const fullTitle = `${title} — ${SITE_NAME}`;

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="ar_SA" />
      <meta property="og:locale:alternate" content="fr_FR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      {/* JSON-LD Structured Data */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
