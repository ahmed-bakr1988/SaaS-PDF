/**
 * Canonical route registry — single source of truth for all application routes.
 *
 * SAFETY RULE: Never remove a route from this list.
 * New routes may only be appended. The route safety test
 * (routes.test.ts) will fail if any existing route is deleted.
 */

import { getAllSeoLandingPaths } from '@/config/seoPages';

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
  '/internal/admin',
] as const;

const SEO_PAGE_ROUTES = getAllSeoLandingPaths();

// ─── Page routes ─────────────────────────────────────────────────
export const PAGE_ROUTES = [
  ...STATIC_PAGE_ROUTES,
  ...SEO_PAGE_ROUTES,
  '/:slug',
  '/ar/:slug',
] as const;

// ─── Tool routes ─────────────────────────────────────────────────
export const TOOL_ROUTES = [
  // PDF Tools
  '/tools/pdf-to-word',
  '/tools/word-to-pdf',
  '/tools/compress-pdf',
  '/tools/merge-pdf',
  '/tools/split-pdf',
  '/tools/rotate-pdf',
  '/tools/pdf-to-images',
  '/tools/images-to-pdf',
  '/tools/watermark-pdf',
  '/tools/protect-pdf',
  '/tools/unlock-pdf',
  '/tools/page-numbers',
  '/tools/pdf-editor',
  '/tools/pdf-flowchart',
  '/tools/pdf-to-excel',
  '/tools/remove-watermark-pdf',
  '/tools/reorder-pdf',
  '/tools/extract-pages',

  // Image Tools
  '/tools/image-converter',
  '/tools/image-resize',
  '/tools/compress-image',
  '/tools/ocr',
  '/tools/remove-background',
  '/tools/image-to-svg',

  // Convert Tools
  '/tools/html-to-pdf',

  // AI Tools
  '/tools/chat-pdf',
  '/tools/summarize-pdf',
  '/tools/translate-pdf',
  '/tools/extract-tables',

  // Other Tools
  '/tools/qr-code',
  '/tools/video-to-gif',
  '/tools/word-counter',
  '/tools/text-cleaner',

  // Phase 2 – PDF Conversion
  '/tools/pdf-to-pptx',
  '/tools/excel-to-pdf',
  '/tools/pptx-to-pdf',
  '/tools/sign-pdf',

  // Phase 2 – PDF Extra Tools
  '/tools/crop-pdf',
  '/tools/flatten-pdf',
  '/tools/repair-pdf',
  '/tools/pdf-metadata',

  // Phase 2 – Image & Utility
  '/tools/image-crop',
  '/tools/image-rotate-flip',
  '/tools/barcode-generator',
] as const;

// ─── All routes combined ─────────────────────────────────────────
export const ALL_ROUTES = [...PAGE_ROUTES, ...TOOL_ROUTES] as const;

export type PageRoute = (typeof PAGE_ROUTES)[number];
export type ToolRoute = (typeof TOOL_ROUTES)[number];
export type AppRoute = (typeof ALL_ROUTES)[number];
