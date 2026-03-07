type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
let initialized = false;

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

export function initAnalytics() {
  if (initialized || !GA_MEASUREMENT_ID || typeof window === 'undefined') return;

  ensureGtagShim();
  loadGaScript();
  window.gtag?.('js', new Date());
  window.gtag?.('config', GA_MEASUREMENT_ID, { send_page_view: false });
  initialized = true;
}

export function trackPageView(path: string) {
  if (!initialized || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title,
  });
}

export function trackEvent(
  eventName: string,
  params: Record<string, AnalyticsValue> = {}
) {
  if (!initialized || !window.gtag) return;
  window.gtag('event', eventName, params);
}

export function analyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID);
}
