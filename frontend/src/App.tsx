import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useDirection } from '@/hooks/useDirection';
import { initAnalytics, trackPageView } from '@/services/analytics';
import { useAuthStore } from '@/stores/authStore';

// Pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));

// Tool Pages
const PdfToWord = lazy(() => import('@/components/tools/PdfToWord'));
const WordToPdf = lazy(() => import('@/components/tools/WordToPdf'));
const PdfCompressor = lazy(() => import('@/components/tools/PdfCompressor'));
const ImageConverter = lazy(() => import('@/components/tools/ImageConverter'));
const VideoToGif = lazy(() => import('@/components/tools/VideoToGif'));
const WordCounter = lazy(() => import('@/components/tools/WordCounter'));
const TextCleaner = lazy(() => import('@/components/tools/TextCleaner'));
const MergePdf = lazy(() => import('@/components/tools/MergePdf'));
const SplitPdf = lazy(() => import('@/components/tools/SplitPdf'));
const RotatePdf = lazy(() => import('@/components/tools/RotatePdf'));
const PdfToImages = lazy(() => import('@/components/tools/PdfToImages'));
const ImagesToPdf = lazy(() => import('@/components/tools/ImagesToPdf'));
const WatermarkPdf = lazy(() => import('@/components/tools/WatermarkPdf'));
const ProtectPdf = lazy(() => import('@/components/tools/ProtectPdf'));
const UnlockPdf = lazy(() => import('@/components/tools/UnlockPdf'));
const AddPageNumbers = lazy(() => import('@/components/tools/AddPageNumbers'));
const PdfEditor = lazy(() => import('@/components/tools/PdfEditor'));
const PdfFlowchart = lazy(() => import('@/components/tools/PdfFlowchart'));

function LoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400" />
    </div>
  );
}

export default function App() {
  useDirection();
  const location = useLocation();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    initAnalytics();
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* PDF Tools */}
            <Route path="/tools/pdf-to-word" element={<PdfToWord />} />
            <Route path="/tools/word-to-pdf" element={<WordToPdf />} />
            <Route path="/tools/compress-pdf" element={<PdfCompressor />} />
            <Route path="/tools/merge-pdf" element={<MergePdf />} />
            <Route path="/tools/split-pdf" element={<SplitPdf />} />
            <Route path="/tools/rotate-pdf" element={<RotatePdf />} />
            <Route path="/tools/pdf-to-images" element={<PdfToImages />} />
            <Route path="/tools/images-to-pdf" element={<ImagesToPdf />} />
            <Route path="/tools/watermark-pdf" element={<WatermarkPdf />} />
            <Route path="/tools/protect-pdf" element={<ProtectPdf />} />
            <Route path="/tools/unlock-pdf" element={<UnlockPdf />} />
            <Route path="/tools/page-numbers" element={<AddPageNumbers />} />
            <Route path="/tools/pdf-editor" element={<PdfEditor />} />
            <Route path="/tools/pdf-flowchart" element={<PdfFlowchart />} />

            {/* Image Tools */}
            <Route path="/tools/image-converter" element={<ImageConverter />} />

            {/* Video Tools */}
            <Route path="/tools/video-to-gif" element={<VideoToGif />} />

            {/* Text Tools */}
            <Route path="/tools/word-counter" element={<WordCounter />} />
            <Route path="/tools/text-cleaner" element={<TextCleaner />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
