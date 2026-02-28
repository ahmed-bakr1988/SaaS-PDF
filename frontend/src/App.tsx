import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useDirection } from '@/hooks/useDirection';

// Pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));

// Tool Pages
const PdfToWord = lazy(() => import('@/components/tools/PdfToWord'));
const WordToPdf = lazy(() => import('@/components/tools/WordToPdf'));
const PdfCompressor = lazy(() => import('@/components/tools/PdfCompressor'));
const ImageConverter = lazy(() => import('@/components/tools/ImageConverter'));
const VideoToGif = lazy(() => import('@/components/tools/VideoToGif'));
const WordCounter = lazy(() => import('@/components/tools/WordCounter'));
const TextCleaner = lazy(() => import('@/components/tools/TextCleaner'));

function LoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );
}

export default function App() {
  useDirection();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* PDF Tools */}
            <Route path="/tools/pdf-to-word" element={<PdfToWord />} />
            <Route path="/tools/word-to-pdf" element={<WordToPdf />} />
            <Route path="/tools/compress-pdf" element={<PdfCompressor />} />

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
