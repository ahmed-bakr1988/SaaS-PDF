/**
 * Canonical route registry — single source of truth for all application routes.
 *
 * SAFETY RULE: Never remove a route from this list.
 * New routes may only be appended. The route safety test
 * (routes.test.ts) will fail if any existing route is deleted.
 *
 * Tool routes are now derived from the unified manifest (toolManifest.ts).
 */

import { getAllSeoLandingPaths } from '@/config/seoPages';
import { getManifestRoutePaths } from '@/config/toolManifest';

const STATIC_PAGE_ROUTES = [
  '/',
  '/about',
  '/account',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/contact',
  '/pricing',
  '/blog',
  '/blog/:slug',
  '/developers',
  '/tools',
  '/internal/admin',
  '/pricing-transparency',
] as const;

const SEO_PAGE_ROUTES = getAllSeoLandingPaths();

// ─── Page routes ─────────────────────────────────────────────────
export const PAGE_ROUTES = [
  ...STATIC_PAGE_ROUTES,
  ...SEO_PAGE_ROUTES,
  '/:slug',
  '/ar/:slug',
] as const;

// ─── Tool routes (derived from manifest) ─────────────────────────
export const TOOL_ROUTES = getManifestRoutePaths() as unknown as readonly string[];

// ─── All routes combined ─────────────────────────────────────────
export const ALL_ROUTES = [...PAGE_ROUTES, ...TOOL_ROUTES] as const;

export type PageRoute = (typeof PAGE_ROUTES)[number];
export type ToolRoute = (typeof TOOL_ROUTES)[number];
export type AppRoute = (typeof ALL_ROUTES)[number];
