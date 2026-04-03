import { describe, expect, it } from 'vitest';

import {
  diffUrlLists,
  extractLocs,
  normalizeEndpoint,
  normalizeOrigin,
} from './submit-indexnow.mjs';

describe('submit-indexnow helpers', () => {
  it('normalizes endpoints to the /indexnow path', () => {
    expect(normalizeEndpoint('https://www.bing.com')).toBe('https://www.bing.com/indexnow');
    expect(normalizeEndpoint('https://www.bing.com/indexnow')).toBe('https://www.bing.com/indexnow');
  });

  it('normalizes origins without a trailing slash', () => {
    expect(normalizeOrigin('https://dociva.io/').toString()).toBe('https://dociva.io/');
  });

  it('extracts loc entries from sitemap xml', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n  <url><loc>https://dociva.io/a</loc></url>\n  <url><loc>https://dociva.io/b</loc></url>\n</urlset>`;
    expect(extractLocs(xml)).toEqual(['https://dociva.io/a', 'https://dociva.io/b']);
  });

  it('returns the full set on the first submission', () => {
    expect(diffUrlLists(['https://dociva.io/a', 'https://dociva.io/b'], [])).toEqual([
      'https://dociva.io/a',
      'https://dociva.io/b',
    ]);
  });

  it('returns only added and removed urls after the first submission', () => {
    expect(
      diffUrlLists(
        ['https://dociva.io/a', 'https://dociva.io/c'],
        ['https://dociva.io/a', 'https://dociva.io/b'],
      ),
    ).toEqual(['https://dociva.io/b', 'https://dociva.io/c']);
  });
});