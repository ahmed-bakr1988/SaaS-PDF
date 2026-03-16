import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CookieConsent from '@/components/layout/CookieConsent';
import SiteAssistant from '@/components/layout/SiteAssistant';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ToolLandingPage from '@/components/seo/ToolLandingPage';
import { useDirection } from '@/hooks/useDirection';
import { initAnalytics, trackPageView } from '@/services/analytics';
import { useAuthStore } from '@/stores/authStore';

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
const BlogPage = lazy(() => import('@/pages/BlogPage'));
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'));
const DevelopersPage = lazy(() => import('@/pages/DevelopersPage'));
const InternalAdminPage = lazy(() => import('@/pages/InternalAdminPage'));

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
const ImageResize = lazy(() => import('@/components/tools/ImageResize'));
const OcrTool = lazy(() => import('@/components/tools/OcrTool'));
const RemoveBackground = lazy(() => import('@/components/tools/RemoveBackground'));
const CompressImage = lazy(() => import('@/components/tools/CompressImage'));
const PdfToExcel = lazy(() => import('@/components/tools/PdfToExcel'));
const RemoveWatermark = lazy(() => import('@/components/tools/RemoveWatermark'));
const ReorderPdf = lazy(() => import('@/components/tools/ReorderPdf'));
const ExtractPages = lazy(() => import('@/components/tools/ExtractPages'));
const QrCodeGenerator = lazy(() => import('@/components/tools/QrCodeGenerator'));
const HtmlToPdf = lazy(() => import('@/components/tools/HtmlToPdf'));
const ChatPdf = lazy(() => import('@/components/tools/ChatPdf'));
const SummarizePdf = lazy(() => import('@/components/tools/SummarizePdf'));
const TranslatePdf = lazy(() => import('@/components/tools/TranslatePdf'));
const TableExtractor = lazy(() => import('@/components/tools/TableExtractor'));

// Phase 2 lazy imports
const PdfToPptx = lazy(() => import('@/components/tools/PdfToPptx'));
const ExcelToPdf = lazy(() => import('@/components/tools/ExcelToPdf'));
const PptxToPdf = lazy(() => import('@/components/tools/PptxToPdf'));
const SignPdf = lazy(() => import('@/components/tools/SignPdf'));
const CropPdf = lazy(() => import('@/components/tools/CropPdf'));
const FlattenPdf = lazy(() => import('@/components/tools/FlattenPdf'));
const RepairPdf = lazy(() => import('@/components/tools/RepairPdf'));
const PdfMetadata = lazy(() => import('@/components/tools/PdfMetadata'));
const ImageCrop = lazy(() => import('@/components/tools/ImageCrop'));
const ImageRotateFlip = lazy(() => import('@/components/tools/ImageRotateFlip'));
const BarcodeGenerator = lazy(() => import('@/components/tools/BarcodeGenerator'));

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
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/internal/admin" element={<InternalAdminPage />} />

            {/* PDF Tools */}
            <Route path="/tools/pdf-to-word" element={<ToolLandingPage slug="pdf-to-word"><PdfToWord /></ToolLandingPage>} />
            <Route path="/tools/word-to-pdf" element={<ToolLandingPage slug="word-to-pdf"><WordToPdf /></ToolLandingPage>} />
            <Route path="/tools/compress-pdf" element={<ToolLandingPage slug="compress-pdf"><PdfCompressor /></ToolLandingPage>} />
            <Route path="/tools/merge-pdf" element={<ToolLandingPage slug="merge-pdf"><MergePdf /></ToolLandingPage>} />
            <Route path="/tools/split-pdf" element={<ToolLandingPage slug="split-pdf"><SplitPdf /></ToolLandingPage>} />
            <Route path="/tools/rotate-pdf" element={<ToolLandingPage slug="rotate-pdf"><RotatePdf /></ToolLandingPage>} />
            <Route path="/tools/pdf-to-images" element={<ToolLandingPage slug="pdf-to-images"><PdfToImages /></ToolLandingPage>} />
            <Route path="/tools/images-to-pdf" element={<ToolLandingPage slug="images-to-pdf"><ImagesToPdf /></ToolLandingPage>} />
            <Route path="/tools/watermark-pdf" element={<ToolLandingPage slug="watermark-pdf"><WatermarkPdf /></ToolLandingPage>} />
            <Route path="/tools/protect-pdf" element={<ToolLandingPage slug="protect-pdf"><ProtectPdf /></ToolLandingPage>} />
            <Route path="/tools/unlock-pdf" element={<ToolLandingPage slug="unlock-pdf"><UnlockPdf /></ToolLandingPage>} />
            <Route path="/tools/page-numbers" element={<ToolLandingPage slug="page-numbers"><AddPageNumbers /></ToolLandingPage>} />
            <Route path="/tools/pdf-editor" element={<ToolLandingPage slug="pdf-editor"><PdfEditor /></ToolLandingPage>} />
            <Route path="/tools/pdf-flowchart" element={<ToolLandingPage slug="pdf-flowchart"><PdfFlowchart /></ToolLandingPage>} />

            {/* Image Tools */}
            <Route path="/tools/image-converter" element={<ToolLandingPage slug="image-converter"><ImageConverter /></ToolLandingPage>} />
            <Route path="/tools/image-resize" element={<ToolLandingPage slug="image-resize"><ImageResize /></ToolLandingPage>} />
            <Route path="/tools/compress-image" element={<ToolLandingPage slug="compress-image"><CompressImage /></ToolLandingPage>} />
            <Route path="/tools/ocr" element={<ToolLandingPage slug="ocr"><OcrTool /></ToolLandingPage>} />
            <Route path="/tools/remove-background" element={<ToolLandingPage slug="remove-background"><RemoveBackground /></ToolLandingPage>} />

            {/* Convert Tools */}
            <Route path="/tools/pdf-to-excel" element={<ToolLandingPage slug="pdf-to-excel"><PdfToExcel /></ToolLandingPage>} />
            <Route path="/tools/html-to-pdf" element={<ToolLandingPage slug="html-to-pdf"><HtmlToPdf /></ToolLandingPage>} />

            {/* PDF Extra Tools */}
            <Route path="/tools/remove-watermark-pdf" element={<ToolLandingPage slug="remove-watermark-pdf"><RemoveWatermark /></ToolLandingPage>} />
            <Route path="/tools/reorder-pdf" element={<ToolLandingPage slug="reorder-pdf"><ReorderPdf /></ToolLandingPage>} />
            <Route path="/tools/extract-pages" element={<ToolLandingPage slug="extract-pages"><ExtractPages /></ToolLandingPage>} />

            {/* AI Tools */}
            <Route path="/tools/chat-pdf" element={<ToolLandingPage slug="chat-pdf"><ChatPdf /></ToolLandingPage>} />
            <Route path="/tools/summarize-pdf" element={<ToolLandingPage slug="summarize-pdf"><SummarizePdf /></ToolLandingPage>} />
            <Route path="/tools/translate-pdf" element={<ToolLandingPage slug="translate-pdf"><TranslatePdf /></ToolLandingPage>} />
            <Route path="/tools/extract-tables" element={<ToolLandingPage slug="extract-tables"><TableExtractor /></ToolLandingPage>} />

            {/* Other Tools */}
            <Route path="/tools/qr-code" element={<ToolLandingPage slug="qr-code"><QrCodeGenerator /></ToolLandingPage>} />

            {/* Video Tools */}
            <Route path="/tools/video-to-gif" element={<ToolLandingPage slug="video-to-gif"><VideoToGif /></ToolLandingPage>} />

            {/* Text Tools */}
            <Route path="/tools/word-counter" element={<ToolLandingPage slug="word-counter"><WordCounter /></ToolLandingPage>} />
            <Route path="/tools/text-cleaner" element={<ToolLandingPage slug="text-cleaner"><TextCleaner /></ToolLandingPage>} />

            {/* Phase 2 – PDF Conversion */}
            <Route path="/tools/pdf-to-pptx" element={<ToolLandingPage slug="pdf-to-pptx"><PdfToPptx /></ToolLandingPage>} />
            <Route path="/tools/excel-to-pdf" element={<ToolLandingPage slug="excel-to-pdf"><ExcelToPdf /></ToolLandingPage>} />
            <Route path="/tools/pptx-to-pdf" element={<ToolLandingPage slug="pptx-to-pdf"><PptxToPdf /></ToolLandingPage>} />
            <Route path="/tools/sign-pdf" element={<ToolLandingPage slug="sign-pdf"><SignPdf /></ToolLandingPage>} />

            {/* Phase 2 – PDF Extra */}
            <Route path="/tools/crop-pdf" element={<ToolLandingPage slug="crop-pdf"><CropPdf /></ToolLandingPage>} />
            <Route path="/tools/flatten-pdf" element={<ToolLandingPage slug="flatten-pdf"><FlattenPdf /></ToolLandingPage>} />
            <Route path="/tools/repair-pdf" element={<ToolLandingPage slug="repair-pdf"><RepairPdf /></ToolLandingPage>} />
            <Route path="/tools/pdf-metadata" element={<ToolLandingPage slug="pdf-metadata"><PdfMetadata /></ToolLandingPage>} />

            {/* Phase 2 – Image & Utility */}
            <Route path="/tools/image-crop" element={<ToolLandingPage slug="image-crop"><ImageCrop /></ToolLandingPage>} />
            <Route path="/tools/image-rotate-flip" element={<ToolLandingPage slug="image-rotate-flip"><ImageRotateFlip /></ToolLandingPage>} />
            <Route path="/tools/barcode-generator" element={<ToolLandingPage slug="barcode-generator"><BarcodeGenerator /></ToolLandingPage>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
      <SiteAssistant />
      <CookieConsent />
    </div>
  );
}
