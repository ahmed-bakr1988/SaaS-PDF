import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ALL_ROUTES } from '@/config/routes';
import { getAllSeoLandingPaths } from '@/config/seoPages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SAFETY TEST — Route Integrity
 *
 * Ensures that every route in the canonical registry (routes.ts)
 * has a matching <Route path="..."> in App.tsx.
 *
 * If this test fails it means either:
 *  1. A route was removed from App.tsx (NEVER do this)
 *  2. A route was added to routes.ts but not yet wired in App.tsx
 */
describe('Route safety', () => {
  const appSource = readFileSync(
    resolve(__dirname, '../App.tsx'),
    'utf-8'
  );
  const seoLandingPaths = new Set(getAllSeoLandingPaths());

  // Extract all path="..." values from <Route> elements
  const routePathRegex = /path="([^"]+)"/g;
  const appPaths = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = routePathRegex.exec(appSource)) !== null) {
    if (match[1] !== '*') appPaths.add(match[1]);
  }

  it('App.tsx contains routes for every entry in the route registry', () => {
    const hasDynamicSeoRoute = appPaths.has('/:slug');
    const missing = ALL_ROUTES.filter((route) => {
      if (appPaths.has(route)) {
        return false;
      }

      if (hasDynamicSeoRoute && seoLandingPaths.has(route)) {
        return false;
      }

      return true;
    });
    expect(missing, `Missing routes in App.tsx: ${missing.join(', ')}`).toEqual([]);
  });

  it('App.tsx contains the dynamic SEO routes', () => {
    expect(appPaths.has('/:slug')).toBe(true);
    expect(appPaths.has('/ar/:slug')).toBe(true);
  });

  it('route registry is not empty', () => {
    expect(ALL_ROUTES.length).toBeGreaterThan(0);
  });

  it('no duplicate routes in the registry', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const route of ALL_ROUTES) {
      if (seen.has(route)) duplicates.push(route);
      seen.add(route);
    }
    expect(duplicates, `Duplicate routes: ${duplicates.join(', ')}`).toEqual([]);
  });
});
