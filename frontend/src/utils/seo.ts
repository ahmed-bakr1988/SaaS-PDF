/**
 * SEO utility functions for structured data generation.
 */

export interface ToolSeoData {
  name: string;
  description: string;
  url: string;
  category?: string;
  ratingValue?: number;
  ratingCount?: number;
  features?: string[];
  /** Optional HowTo steps for inline HowTo within the tool schema */
  howToSteps?: string[];
}

export interface LanguageAlternate {
  hrefLang: string;
  href: string;
  ogLocale: string;
}

const DEFAULT_SOCIAL_IMAGE_PATH = '/social-preview.svg';
const DEFAULT_SITE_ORIGIN = 'https://dociva.io';
const DEFAULT_SITE_NAME = 'Dociva';

const LANGUAGE_CONFIG: Record<'en' | 'ar' | 'fr', { hrefLang: string; ogLocale: string }> = {
  en: { hrefLang: 'en', ogLocale: 'en_US' },
  ar: { hrefLang: 'ar', ogLocale: 'ar_SA' },
  fr: { hrefLang: 'fr', ogLocale: 'fr_FR' },
};

export function normalizeSiteLanguage(language: string): 'en' | 'ar' | 'fr' {
  const baseLanguage = language.split('-')[0];
  return baseLanguage === 'ar' || baseLanguage === 'fr' ? baseLanguage : 'en';
}

export function getOgLocale(language: string): string {
  return LANGUAGE_CONFIG[normalizeSiteLanguage(language)].ogLocale;
}

export function buildLanguageAlternates(
  origin: string,
  localizedPaths: Partial<Record<'en' | 'ar' | 'fr', string>>,
): LanguageAlternate[] {
  return (Object.entries(localizedPaths) as Array<[keyof typeof LANGUAGE_CONFIG, string | undefined]>)
    .filter(([, path]) => Boolean(path))
    .map(([language, path]) => ({
      hrefLang: LANGUAGE_CONFIG[language].hrefLang,
      href: `${origin}${path}`,
      ogLocale: LANGUAGE_CONFIG[language].ogLocale,
    }));
}

export function getSiteOrigin(currentOrigin = ''): string {
  const configuredOrigin = String(import.meta.env.VITE_SITE_DOMAIN || '').trim().replace(/\/$/, '');
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (currentOrigin) {
    return currentOrigin.replace(/\/$/, '');
  }

  return DEFAULT_SITE_ORIGIN;
}

export function buildSocialImageUrl(origin: string): string {
  return `${origin}${DEFAULT_SOCIAL_IMAGE_PATH}`;
}

/**
 * Generate WebApplication JSON-LD structured data for a tool page.
 */
export function generateToolSchema(tool: ToolSeoData): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    url: tool.url,
    applicationCategory: tool.category || 'UtilitiesApplication',
    applicationSubCategory: tool.category || 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Works in modern browsers.',
    isAccessibleForFree: true,
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '9.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description: 'Pro plan — higher limits, no ads, API access',
      },
    ],
    description: tool.description,
    inLanguage: ['en', 'ar', 'fr'],
    provider: {
      '@type': 'Organization',
      name: DEFAULT_SITE_NAME,
      url: getSiteOrigin(),
    },
    potentialAction: {
      '@type': 'UseAction',
      target: tool.url,
      name: `Use ${tool.name}`,
    },
    screenshot: `${getSiteOrigin()}/social-preview.svg`,
  };

  if (tool.features && tool.features.length > 0) {
    schema.featureList = tool.features;
  }

  if (tool.ratingValue && tool.ratingCount && tool.ratingCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: tool.ratingValue,
      ratingCount: tool.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList JSON-LD.
 */
export function generateBreadcrumbs(
  items: { name: string; url: string }[]
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate FAQ structured data.
 */
export function generateFAQ(
  questions: { question: string; answer: string }[]
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

export function generateHowTo(data: {
  name: string;
  description: string;
  steps: string[];
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: data.name,
    description: data.description,
    url: data.url,
    step: data.steps.map((text, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: text,
      text,
    })),
  };
}

/**
 * Generate Organization JSON-LD for the site.
 */
export function generateOrganization(origin: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: DEFAULT_SITE_NAME,
    alternateName: 'Dociva File Tools',
    url: origin,
    logo: {
      '@type': 'ImageObject',
      url: `${origin}/logo.svg`,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@dociva.io',
      contactType: 'customer support',
      availableLanguage: ['English', 'Arabic', 'French'],
    },
  };
}

/**
 * Generate WebPage JSON-LD for a static page.
 */
export function generateWebPage(page: {
  name: string;
  description: string;
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.name,
    description: page.description,
    url: page.url,
    inLanguage: ['en', 'ar', 'fr'],
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${getSiteOrigin()}/#website`,
      name: DEFAULT_SITE_NAME,
    },
  };
}

export function generateWebSite(data: {
  origin: string;
  description: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${data.origin}/#website`,
    name: DEFAULT_SITE_NAME,
    url: data.origin,
    description: data.description,
    publisher: {
      '@id': `${data.origin}/#organization`,
    },
    inLanguage: ['en', 'ar', 'fr'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${data.origin}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateCollectionPage(data: {
  name: string;
  description: string;
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: data.name,
    description: data.description,
    url: data.url,
    isPartOf: {
      '@id': `${getSiteOrigin()}/#website`,
    },
  };
}

export function generateItemList(items: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function generateBlogPosting(post: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  inLanguage: string;
}): object {
  const origin = getSiteOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.headline,
    description: post.description,
    url: post.url,
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    inLanguage: post.inLanguage,
    isAccessibleForFree: true,
    author: {
      '@type': 'Organization',
      name: DEFAULT_SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: DEFAULT_SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.url,
    },
  };
}
