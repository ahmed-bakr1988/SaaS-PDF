import { lazy, Suspense, useEffect, useState } from 'react';
import Clarity from '@microsoft/clarity';
import { Routes, Route, useLocation, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ScrollToTopButton from '@/components/shared/ScrollToTopButton';
import ToolLandingPage from '@/components/seo/ToolLandingPage';
import { useDirection } from '@/hooks/useDirection';
import { initAnalytics, trackPageView } from '@/services/analytics';
import { useAuthStore } from '@/stores/authStore';
import { TOOL_MANIFEST } from '@/config/toolManifest';
import { ensureLanguageResources } from '@/i18n';

let clarityInitialized = false;

// Pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const PricingTransparencyPage = lazy(() => import('@/pages/PricingTransparencyPage'));
const BalanceDepletedPage = lazy(() => import('@/pages/BalanceDepletedPage'));
const PaymentPage = lazy(() => import('@/pages/PaymentPage'));
const BlogPage = lazy(() => import('@/pages/BlogPage'));
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'));
const DevelopersPage = lazy(() => import('@/pages/DevelopersPage'));
const AllToolsPage = lazy(() => import('@/pages/AllToolsPage'));
const InternalAdminPage = lazy(() => import('@/pages/InternalAdminPage'));
const SeoRoutePage = lazy(() => import('@/pages/SeoRoutePage'));
const ComparisonPage = lazy(() => import('@/pages/ComparisonPage'));
const ProcessingErrorPage = lazy(() => import('@/pages/ProcessingErrorPage'));
const CookieConsent = lazy(() => import('@/components/layout/CookieConsent'));
const SiteAssistant = lazy(() => import('@/components/layout/SiteAssistant'));
const PwaUpdatePrompt = lazy(() => import('@/components/layout/PwaUpdatePrompt'));

// Tool components — derived from manifest using React.lazy
const ToolComponents = Object.fromEntries(
  TOOL_MANIFEST.map((tool) => [tool.slug, lazy(tool.component)])
) as Record<string, React.LazyExoticComponent<React.ComponentType>>;

function LocalizedToolRoute() {
  const { locale, slug } = useParams<{ locale?: string; slug?: string }>();

  if (!locale || !slug || !['ar', 'fr', 'es'].includes(locale)) {
    return <NotFoundPage />;
  }

  const tool = TOOL_MANIFEST.find((entry) => entry.slug === slug);
  if (!tool) {
    return <NotFoundPage />;
  }

  const Component = ToolComponents[tool.slug];
  return <ToolLandingPage slug={tool.slug}><Component /></ToolLandingPage>;
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400" />
    </div>
  );
}

function IdleLoad({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setReady(true));
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(id);
  }, []);
  return ready ? <>{children}</> : null;
}

export default function App() {
  useDirection();
  const location = useLocation();
  const { i18n } = useTranslation();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
  const isMarketingLayout =
    location.pathname === '/' ||
    ['/about', '/contact', '/pricing', '/tools', '/developers', '/pricing-transparency', '/balance-depleted', '/payment'].includes(location.pathname) ||
    location.pathname.startsWith('/compare/');

  useEffect(() => {
    initAnalytics();
    void refreshUser();
  }, [refreshUser]);

  // Microsoft Clarity: Run only in production and browser
  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === 'undefined') return;

    const projectId = (import.meta.env.VITE_CLARITY_PROJECT_ID || '').trim();
    if (!projectId) return;

    const tryInitClarity = () => {
      if (clarityInitialized) return;
      try {
        const rawConsent = localStorage.getItem('cookie_consent');
        const parsed = rawConsent ? JSON.parse(rawConsent) : null;
        const hasConsent = parsed?.state === 'accepted';
        if (hasConsent) {
          Clarity.init(projectId);
          clarityInitialized = true;
        }
      } catch {
        // Ignore malformed consent payloads.
      }
    };

    tryInitClarity();

    const onConsent = (event: Event) => {
      const customEvent = event as CustomEvent<{ accepted: boolean }>;
      if (customEvent.detail?.accepted && !clarityInitialized) {
        Clarity.init(projectId);
        clarityInitialized = true;
      }
    };

    window.addEventListener('cookie-consent', onConsent as EventListener);
    return () => window.removeEventListener('cookie-consent', onConsent as EventListener);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const routeLocale = location.pathname.match(/^\/(ar|fr|es)(?:\/|$)/)?.[1];
    if (!routeLocale || i18n.language === routeLocale) {
      return;
    }

    void ensureLanguageResources(routeLocale).then((resolved) => {
      if (i18n.language !== resolved) {
        void i18n.changeLanguage(resolved);
      }
    });
  }, [i18n, location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-300 dark:bg-slate-950 pb-16 md:pb-0">
      <Header />

      <main className={isMarketingLayout ? 'flex-1' : 'container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8'}>
        <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/pricing-transparency" element={<PricingTransparencyPage />} />
            <Route path="/balance-depleted" element={<BalanceDepletedPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/tools" element={<AllToolsPage />} />
            <Route path="/internal/admin" element={<InternalAdminPage />} />
            <Route path="/compare/:slug" element={<ComparisonPage />} />
            <Route path="/ar/:slug" element={<SeoRoutePage />} />
            <Route path="/:locale/tools/:slug" element={<LocalizedToolRoute />} />
            <Route path="/:slug" element={<SeoRoutePage />} />

            {/* Tool Routes — driven by the unified manifest */}
            {TOOL_MANIFEST.map((tool) => {
              const Component = ToolComponents[tool.slug];
              return (
                <Route
                  key={tool.slug}
                  path={`/tools/${tool.slug}`}
                  element={<ToolLandingPage slug={tool.slug}><Component /></ToolLandingPage>}
                />
              );
            })}

            {/* Error Pages */}
            <Route path="/error/processing" element={<ProcessingErrorPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
      <MobileBottomNav />
      <Suspense fallback={null}>
        <IdleLoad>
          <SiteAssistant />
        </IdleLoad>
        <CookieConsent />
        <PwaUpdatePrompt />
      </Suspense>
      <Toaster
        position={isRTL ? 'top-left' : 'top-right'}
        dir={isRTL ? 'rtl' : 'ltr'}
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          className: 'text-sm',
        }}
      />
    </div>
  );
}
