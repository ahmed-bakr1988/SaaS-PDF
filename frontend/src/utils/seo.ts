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
}

/**
 * Generate WebApplication JSON-LD structured data for a tool page.
 */
export function generateToolSchema(tool: ToolSeoData): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    url: tool.url,
    applicationCategory: tool.category || 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: tool.description,
    inLanguage: ['en', 'ar', 'fr'],
  };

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

/**
 * Generate Organization JSON-LD for the site.
 */
export function generateOrganization(origin: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SaaS-PDF',
    url: origin,
    logo: `${origin}/favicon.svg`,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@saas-pdf.com',
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
    isPartOf: {
      '@type': 'WebSite',
      name: 'SaaS-PDF',
    },
  };
}
