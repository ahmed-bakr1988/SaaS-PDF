/**
 * Comparison page data — defines competitor comparisons for SEO landing pages.
 *
 * Adding a new comparison:
 *   1. Append an entry to COMPARISON_PAGES below.
 *   2. Add matching i18n keys under pages.comparison.<i18nKey>.* in en/ar/fr.json.
 *   3. Add the slug to both sitemap generators (generate_sitemap.py + generate-seo-assets.mjs).
 */

export interface ComparisonFeature {
  /** i18n key suffix under pages.comparison.features.* */
  key: string;
  /** true = has the feature, false = missing, 'partial' = limited */
  us: boolean | 'partial';
  competitor: boolean | 'partial';
}

export interface ComparisonPage {
  /** URL slug: /compare/<slug> */
  slug: string;
  /** i18n key prefix: pages.comparison.<i18nKey>.* */
  i18nKey: string;
  /** Our tool slug (links to /tools/<ourToolSlug>) */
  ourToolSlug: string;
  /** Competitor display name */
  competitorName: string;
  /** SEO category */
  category: 'PDF' | 'Image' | 'AI' | 'Convert' | 'Utility';
  /** Feature comparison rows */
  features: ComparisonFeature[];
  /** Related comparison page slugs */
  relatedComparisonSlugs: string[];
  /** Tool slugs to show as related */
  relatedToolSlugs: string[];
}

export const COMPARISON_PAGES: ComparisonPage[] = [
  {
    slug: 'compress-pdf-vs-ilovepdf',
    i18nKey: 'compressPdfVsIlovepdf',
    ourToolSlug: 'compress-pdf',
    competitorName: 'iLovePDF',
    category: 'PDF',
    features: [
      { key: 'freeUnlimited', us: true, competitor: false },
      { key: 'noSignup', us: true, competitor: false },
      { key: 'batchProcessing', us: true, competitor: 'partial' },
      { key: 'compressionLevels', us: true, competitor: true },
      { key: 'autoDelete', us: true, competitor: true },
      { key: 'noAds', us: true, competitor: false },
      { key: 'apiAccess', us: true, competitor: true },
      { key: 'offlineMode', us: false, competitor: false },
    ],
    relatedComparisonSlugs: ['merge-pdf-vs-smallpdf', 'pdf-to-word-vs-adobe-acrobat'],
    relatedToolSlugs: ['compress-pdf', 'merge-pdf', 'split-pdf', 'compress-image'],
  },
  {
    slug: 'merge-pdf-vs-smallpdf',
    i18nKey: 'mergePdfVsSmallpdf',
    ourToolSlug: 'merge-pdf',
    competitorName: 'Smallpdf',
    category: 'PDF',
    features: [
      { key: 'freeUnlimited', us: true, competitor: false },
      { key: 'noSignup', us: true, competitor: false },
      { key: 'batchProcessing', us: true, competitor: true },
      { key: 'dragReorder', us: true, competitor: true },
      { key: 'autoDelete', us: true, competitor: true },
      { key: 'noAds', us: true, competitor: false },
      { key: 'apiAccess', us: true, competitor: 'partial' },
      { key: 'offlineMode', us: false, competitor: false },
    ],
    relatedComparisonSlugs: ['compress-pdf-vs-ilovepdf', 'pdf-to-word-vs-adobe-acrobat'],
    relatedToolSlugs: ['merge-pdf', 'split-pdf', 'compress-pdf', 'reorder-pdf'],
  },
  {
    slug: 'pdf-to-word-vs-adobe-acrobat',
    i18nKey: 'pdfToWordVsAdobeAcrobat',
    ourToolSlug: 'pdf-to-word',
    competitorName: 'Adobe Acrobat',
    category: 'PDF',
    features: [
      { key: 'freeUnlimited', us: true, competitor: false },
      { key: 'noSignup', us: true, competitor: false },
      { key: 'preserveFormatting', us: true, competitor: true },
      { key: 'batchProcessing', us: true, competitor: true },
      { key: 'autoDelete', us: true, competitor: true },
      { key: 'noAds', us: true, competitor: true },
      { key: 'noInstall', us: true, competitor: false },
      { key: 'offlineMode', us: false, competitor: true },
    ],
    relatedComparisonSlugs: ['compress-pdf-vs-ilovepdf', 'merge-pdf-vs-smallpdf'],
    relatedToolSlugs: ['pdf-to-word', 'word-to-pdf', 'pdf-to-excel', 'compress-pdf'],
  },
  {
    slug: 'compress-image-vs-tinypng',
    i18nKey: 'compressImageVsTinypng',
    ourToolSlug: 'compress-image',
    competitorName: 'TinyPNG',
    category: 'Image',
    features: [
      { key: 'freeUnlimited', us: true, competitor: false },
      { key: 'noSignup', us: true, competitor: true },
      { key: 'multiFormat', us: true, competitor: 'partial' },
      { key: 'batchProcessing', us: true, competitor: 'partial' },
      { key: 'qualityControl', us: true, competitor: false },
      { key: 'autoDelete', us: true, competitor: true },
      { key: 'apiAccess', us: true, competitor: true },
      { key: 'offlineMode', us: false, competitor: false },
    ],
    relatedComparisonSlugs: ['compress-pdf-vs-ilovepdf', 'ocr-vs-adobe-scan'],
    relatedToolSlugs: ['compress-image', 'image-converter', 'image-resize', 'remove-background'],
  },
  {
    slug: 'ocr-vs-adobe-scan',
    i18nKey: 'ocrVsAdobeScan',
    ourToolSlug: 'ocr',
    competitorName: 'Adobe Scan',
    category: 'AI',
    features: [
      { key: 'freeUnlimited', us: true, competitor: false },
      { key: 'noSignup', us: true, competitor: false },
      { key: 'noInstall', us: true, competitor: false },
      { key: 'multiLanguageOcr', us: true, competitor: true },
      { key: 'batchProcessing', us: true, competitor: false },
      { key: 'autoDelete', us: true, competitor: true },
      { key: 'apiAccess', us: true, competitor: false },
      { key: 'offlineMode', us: false, competitor: true },
    ],
    relatedComparisonSlugs: ['pdf-to-word-vs-adobe-acrobat', 'compress-image-vs-tinypng'],
    relatedToolSlugs: ['ocr', 'chat-pdf', 'summarize-pdf', 'pdf-to-word'],
  },
];

export function getComparisonPage(slug: string): ComparisonPage | undefined {
  return COMPARISON_PAGES.find((p) => p.slug === slug);
}

export function getAllComparisonSlugs(): string[] {
  return COMPARISON_PAGES.map((p) => p.slug);
}

export function getComparisonPagesByTool(toolSlug: string): ComparisonPage[] {
  return COMPARISON_PAGES.filter((p) => p.ourToolSlug === toolSlug);
}
