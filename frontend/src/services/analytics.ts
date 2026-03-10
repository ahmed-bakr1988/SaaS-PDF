type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
const PLAUSIBLE_DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN || '').trim();
const PLAUSIBLE_SRC = (import.meta.env.VITE_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js').trim();
let initialized = false;

// ─── Google Analytics ────────────────────────────────────────────

function ensureGtagShim() {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
}

function loadGaScript() {
  if (!GA_MEASUREMENT_ID) return;

  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-ga4-id="${GA_MEASUREMENT_ID}"]`
  );
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.setAttribute('data-ga4-id', GA_MEASUREMENT_ID);
  document.head.appendChild(script);
}

// ─── Plausible Analytics ─────────────────────────────────────────

function loadPlausibleScript() {
  if (!PLAUSIBLE_DOMAIN) return;

  const existing = document.querySelector<HTMLScriptElement>('script[data-plausible]');
  if (existing) return;

  const script = document.createElement('script');
  script.defer = true;
  script.setAttribute('data-domain', PLAUSIBLE_DOMAIN);
  script.setAttribute('data-plausible', '');
  script.src = PLAUSIBLE_SRC;
  document.head.appendChild(script);
}

// ─── Search Console verification ─────────────────────────────────

function injectSearchConsoleVerification() {
  const code = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();
  if (!code) return;

  const existing = document.querySelector('meta[name="google-site-verification"]');
  if (existing) return;

  const meta = document.createElement('meta');
  meta.name = 'google-site-verification';
  meta.content = code;
  document.head.appendChild(meta);
}

// ─── Public API ──────────────────────────────────────────────────

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;

  // Google Analytics
  if (GA_MEASUREMENT_ID) {
    ensureGtagShim();
    loadGaScript();
    window.gtag?.('js', new Date());
    window.gtag?.('config', GA_MEASUREMENT_ID, { send_page_view: false });
  }

  // Plausible
  loadPlausibleScript();

  // Search Console
  injectSearchConsoleVerification();

  initialized = true;
}

export function trackPageView(path: string) {
  // GA4
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
    });
  }
  // Plausible tracks page views automatically via its script
}

export function trackEvent(
  eventName: string,
  params: Record<string, AnalyticsValue> = {}
) {
  // GA4
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
  // Plausible custom event
  if (window.plausible) {
    const props: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) props[k] = String(v);
    }
    window.plausible(eventName, { props });
  }
}

export function analyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID) || Boolean(PLAUSIBLE_DOMAIN);
}
