import { describe, expect, it } from 'vitest';
import {
  PROGRAMMATIC_TOOL_PAGES,
  SEO_COLLECTION_PAGES,
  SEO_TOTAL_PAGE_COUNT,
  getLocalizedSeoLandingPaths,
} from '@/seo/seoData';

describe('SEO data engine', () => {
  it('generates at least 50 bilingual SEO pages', () => {
    expect(SEO_TOTAL_PAGE_COUNT).toBeGreaterThanOrEqual(50);
  });

  it('has no duplicate english slugs', () => {
    const englishPaths = getLocalizedSeoLandingPaths('en');
    expect(new Set(englishPaths).size).toBe(englishPaths.length);
  });

  it('generates matching arabic localized paths', () => {
    const englishPaths = getLocalizedSeoLandingPaths('en');
    const arabicPaths = getLocalizedSeoLandingPaths('ar');
    expect(arabicPaths.length).toBe(englishPaths.length);
    expect(arabicPaths.every((path) => path.startsWith('/ar/'))).toBe(true);
  });

  it('keeps both tool and collection SEO inventories populated', () => {
    expect(PROGRAMMATIC_TOOL_PAGES.length).toBeGreaterThan(30);
    expect(SEO_COLLECTION_PAGES.length).toBeGreaterThanOrEqual(10);
  });
});
