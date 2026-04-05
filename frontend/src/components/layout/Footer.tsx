import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, FileText, Layers3 } from 'lucide-react';

interface FooterTool {
  slug: string;
  i18nKey: string;
  isLanding?: boolean;
  isComparison?: boolean;
}

const FOOTER_TOOLS: Record<string, FooterTool[]> = {
  PDF: [
    { slug: 'pdf-to-word', i18nKey: 'tools.pdfToWord.title' },
    { slug: 'compress-pdf', i18nKey: 'tools.compressPdf.title' },
    { slug: 'merge-pdf', i18nKey: 'tools.mergePdf.title' },
    { slug: 'split-pdf', i18nKey: 'tools.splitPdf.title' },
    { slug: 'pdf-to-images', i18nKey: 'tools.pdfToImages.title' },
    { slug: 'protect-pdf', i18nKey: 'tools.protectPdf.title' },
    { slug: 'watermark-pdf', i18nKey: 'tools.watermarkPdf.title' },
    { slug: 'pdf-editor', i18nKey: 'tools.pdfEditor.title' },
  ],
  'Image & Convert': [
    { slug: 'compress-image', i18nKey: 'tools.compressImage.title' },
    { slug: 'image-converter', i18nKey: 'tools.imageConvert.title' },
    { slug: 'image-resize', i18nKey: 'tools.imageResize.title' },
    { slug: 'remove-background', i18nKey: 'tools.removeBg.title' },
    { slug: 'word-to-pdf', i18nKey: 'tools.wordToPdf.title' },
    { slug: 'html-to-pdf', i18nKey: 'tools.htmlToPdf.title' },
    { slug: 'pdf-to-excel', i18nKey: 'tools.pdfToExcel.title' },
  ],
  'AI & Utility': [
    { slug: 'chat-pdf', i18nKey: 'tools.chatPdf.title' },
    { slug: 'summarize-pdf', i18nKey: 'tools.summarizePdf.title' },
    { slug: 'translate-pdf', i18nKey: 'tools.translatePdf.title' },
    { slug: 'ocr', i18nKey: 'tools.ocr.title' },
    { slug: 'qr-code', i18nKey: 'tools.qrCode.title' },
    { slug: 'video-to-gif', i18nKey: 'tools.videoToGif.title' },
    { slug: 'word-counter', i18nKey: 'tools.wordCounter.title' },
  ],
  Guides: [
    { slug: 'best-pdf-tools', i18nKey: 'footer.guides.bestPdfTools', isLanding: true },
    { slug: 'free-pdf-tools-online', i18nKey: 'footer.guides.freePdfToolsOnline', isLanding: true },
    { slug: 'convert-files-online', i18nKey: 'footer.guides.convertFilesOnline', isLanding: true },
  ],
  Comparisons: [
    { slug: 'compress-pdf-vs-ilovepdf', i18nKey: 'footer.comparisons.compressPdfVsIlovepdf', isComparison: true },
    { slug: 'merge-pdf-vs-smallpdf', i18nKey: 'footer.comparisons.mergePdfVsSmallpdf', isComparison: true },
    { slug: 'pdf-to-word-vs-adobe-acrobat', i18nKey: 'footer.comparisons.pdfToWordVsAdobeAcrobat', isComparison: true },
    { slug: 'compress-image-vs-tinypng', i18nKey: 'footer.comparisons.compressImageVsTinypng', isComparison: true },
    { slug: 'ocr-vs-adobe-scan', i18nKey: 'footer.comparisons.ocrVsAdobeScan', isComparison: true },
  ],
};

const CATEGORY_KEYS: Record<string, string> = {
  'PDF': 'footer.categories.pdf',
  'Image & Convert': 'footer.categories.imageConvert',
  'AI & Utility': 'footer.categories.aiUtility',
  'Guides': 'footer.categories.guides',
  'Comparisons': 'footer.categories.comparisons',
};

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="marketing-panel overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-10 xl:grid-cols-[1.15fr,1.85fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-sky-500 to-accent-500 shadow-lg shadow-primary-200/70 dark:shadow-primary-950/40">
                  <Layers3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                    {t('common.appName')}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('common.siteTagline')}
                  </p>
                </div>
              </div>

              <p className="mt-6 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t('common.footerDescription')}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/tools"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 dark:bg-white dark:text-slate-950 dark:hover:bg-primary-300"
                >
                  {t('common.allTools')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/developers"
                  className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  {t('common.developers')}
                </Link>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Object.entries(FOOTER_TOOLS).map(([category, tools]) => (
                <div key={category}>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {t(CATEGORY_KEYS[category] ?? category)}
                  </h3>
                  <ul className="space-y-2.5">
                    {tools.map((tool) => (
                      <li key={tool.slug}>
                        <Link
                          to={tool.isComparison ? `/compare/${tool.slug}` : tool.isLanding ? `/${tool.slug}` : `/tools/${tool.slug}`}
                          className="text-sm text-slate-600 transition-colors hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
                        >
                          {t(tool.i18nKey)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-slate-200/80 pt-6 dark:border-slate-700/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FileText className="h-4 w-4" />
            <span>© {new Date().getFullYear()} {t('common.appName')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/privacy" className="text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">{t('common.privacy')}</Link>
            <Link to="/terms" className="text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">{t('common.terms')}</Link>
            <Link to="/pricing" className="text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">{t('common.pricing')}</Link>
            <Link to="/pricing-transparency" className="text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">{t('common.pricingTransparency')}</Link>
            <Link to="/about" className="text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">{t('common.about')}</Link>
            <Link to="/contact" className="text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">{t('common.contact')}</Link>
            <Link to="/blog" className="text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">{t('common.blog')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
