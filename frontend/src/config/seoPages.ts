import {
  PROGRAMMATIC_TOOL_PAGES,
  SEO_COLLECTION_PAGES,
  getLocalizedSeoLandingPaths,
} from '@/seo/seoData';

export type SeoLocale = 'en' | 'ar';

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface LocalizedTextList {
  en: string[];
  ar: string[];
}

export interface SeoFaqTemplate {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface SeoContentSection {
  heading: LocalizedText;
  body: LocalizedText;
}

export interface ProgrammaticToolPage {
  slug: string;
  toolSlug: string;
  category: 'PDF' | 'Image' | 'AI' | 'Convert' | 'Utility';
  focusKeyword: LocalizedText;
  supportingKeywords: LocalizedTextList;
  titleTemplate: LocalizedText;
  descriptionTemplate: LocalizedText;
  faqTemplates: SeoFaqTemplate[];
  relatedCollectionSlugs: string[];
  contentSections?: SeoContentSection[];
}

export interface SeoCollectionPage {
  slug: string;
  focusKeyword: LocalizedText;
  supportingKeywords: LocalizedTextList;
  titleTemplate: LocalizedText;
  descriptionTemplate: LocalizedText;
  introTemplate: LocalizedText;
  targetToolSlugs: string[];
  faqTemplates: SeoFaqTemplate[];
  relatedCollectionSlugs: string[];
  contentSections?: SeoContentSection[];
}

export function normalizeSeoLocale(language: string): SeoLocale {
  return language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function getLocalizedText(value: LocalizedText, locale: SeoLocale): string {
  return value[locale] || value.en;
}

export function getLocalizedTextList(value: LocalizedTextList, locale: SeoLocale): string[] {
  return value[locale] || value.en;
}

export function interpolateTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => tokens[key] ?? '');
}

export function getProgrammaticToolPage(slug: string): ProgrammaticToolPage | undefined {
  return PROGRAMMATIC_TOOL_PAGES.find((page) => page.slug === slug);
}

export function getSeoCollectionPage(slug: string): SeoCollectionPage | undefined {
  return SEO_COLLECTION_PAGES.find((page) => page.slug === slug);
}

export function getAllProgrammaticSeoPaths(): string[] {
  return PROGRAMMATIC_TOOL_PAGES.map((page) => `/${page.slug}`);
}

export function getAllCollectionSeoPaths(): string[] {
  return SEO_COLLECTION_PAGES.map((page) => `/${page.slug}`);
}

export function getAllSeoLandingPaths(): string[] {
  return [...getAllProgrammaticSeoPaths(), ...getAllCollectionSeoPaths()];
}

export function getAllLocalizedSeoLandingPaths(): string[] {
  return [...getLocalizedSeoLandingPaths('en'), ...getLocalizedSeoLandingPaths('ar')];
}