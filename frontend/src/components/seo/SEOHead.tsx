import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { buildSocialImageUrl, getOgLocale, getSiteOrigin } from '@/utils/seo';

const SITE_NAME = 'Dociva';

interface SEOHeadProps {
  /** Page title (will be appended with " — Dociva") */
  title: string;
  /** Meta description */
  description: string;
  /** Canonical URL path (e.g. "/about") — origin is auto-prefixed */
  path: string;
  /** OG type — defaults to "website" */
  type?: string;
  /** Optional JSON-LD objects to inject as structured data */
  jsonLd?: object | object[];
  /** Optional explicit language alternates when route-based locale paths are required */
  alternates?: Array<{ hrefLang: string; href: string; ogLocale?: string }>;
}

/**
 * Reusable SEO head component that injects:
 * - title, description, canonical URL
 * - OpenGraph meta tags (title, description, url, type, site_name, locale)
 * - Twitter card meta tags
 * - Optional JSON-LD structured data
 */
export default function SEOHead({ title, description, path, type = 'website', jsonLd, alternates }: SEOHeadProps) {
  const { i18n } = useTranslation();
  const origin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const canonicalUrl = `${origin}${path}`;
  const socialImageUrl = buildSocialImageUrl(origin);
  const fullTitle = `${title} — ${SITE_NAME}`;
  const languageAlternates = alternates ?? [];
  const currentOgLocale = getOgLocale(i18n.language);
  const xDefaultHref = languageAlternates.find((alternate) => alternate.hrefLang === 'en')?.href ?? canonicalUrl;

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <link rel="canonical" href={canonicalUrl} />
      {languageAlternates.map((alternate) => (
        <link
          key={alternate.hrefLang}
          rel="alternate"
          hrefLang={alternate.hrefLang}
          href={alternate.href}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={xDefaultHref} />

      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={socialImageUrl} />
      <meta property="og:image:type" content="image/svg+xml" />
      <meta property="og:image:alt" content={`${fullTitle} social preview`} />
      <meta property="og:locale" content={currentOgLocale} />
      {languageAlternates
        .filter((alternate) => alternate.ogLocale !== currentOgLocale)
        .map((alternate) => (
          <meta key={alternate.ogLocale} property="og:locale:alternate" content={alternate.ogLocale} />
        ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImageUrl} />
      <meta name="twitter:image:alt" content={`${fullTitle} social preview`} />

      {/* JSON-LD Structured Data */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
