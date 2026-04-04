import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, FileText, Layers3 } from 'lucide-react';

const FOOTER_TOOLS = {
  PDF: [
    { slug: 'pdf-to-word', label: 'PDF to Word' },
    { slug: 'compress-pdf', label: 'Compress PDF' },
    { slug: 'merge-pdf', label: 'Merge PDF' },
    { slug: 'split-pdf', label: 'Split PDF' },
    { slug: 'pdf-to-images', label: 'PDF to Images' },
    { slug: 'protect-pdf', label: 'Protect PDF' },
    { slug: 'watermark-pdf', label: 'Watermark PDF' },
    { slug: 'pdf-editor', label: 'PDF Editor' },
  ],
  'Image & Convert': [
    { slug: 'compress-image', label: 'Compress Image' },
    { slug: 'image-converter', label: 'Image Converter' },
    { slug: 'image-resize', label: 'Image Resize' },
    { slug: 'remove-background', label: 'Remove Background' },
    { slug: 'word-to-pdf', label: 'Word to PDF' },
    { slug: 'html-to-pdf', label: 'HTML to PDF' },
    { slug: 'pdf-to-excel', label: 'PDF to Excel' },
  ],
  'AI & Utility': [
    { slug: 'chat-pdf', label: 'Chat with PDF' },
    { slug: 'summarize-pdf', label: 'Summarize PDF' },
    { slug: 'translate-pdf', label: 'Translate PDF' },
    { slug: 'ocr', label: 'OCR' },
    { slug: 'qr-code', label: 'QR Code Generator' },
    { slug: 'video-to-gif', label: 'Video to GIF' },
    { slug: 'word-counter', label: 'Word Counter' },
  ],
  Guides: [
    { slug: 'best-pdf-tools', label: 'Best PDF Tools', isLanding: true },
    { slug: 'free-pdf-tools-online', label: 'Free PDF Tools Online', isLanding: true },
    { slug: 'convert-files-online', label: 'Convert Files Online', isLanding: true },
  ],
  Comparisons: [
    { slug: 'compress-pdf-vs-ilovepdf', label: 'Dociva vs iLovePDF', isComparison: true },
    { slug: 'merge-pdf-vs-smallpdf', label: 'Dociva vs Smallpdf', isComparison: true },
    { slug: 'pdf-to-word-vs-adobe-acrobat', label: 'Dociva vs Adobe Acrobat', isComparison: true },
    { slug: 'compress-image-vs-tinypng', label: 'Dociva vs TinyPNG', isComparison: true },
    { slug: 'ocr-vs-adobe-scan', label: 'Dociva vs Adobe Scan', isComparison: true },
  ],
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
                    {t('common.siteTagline', 'Online PDF and file workflows')}
                  </p>
                </div>
              </div>

              <p className="mt-6 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t(
                  'common.footerDescription',
                  'Convert, compress, edit, and automate document work in one browser-based workspace built for speed, clarity, and secure processing.'
                )}
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
                    {category}
                  </h3>
                  <ul className="space-y-2.5">
                    {tools.map((tool) => (
                      <li key={tool.slug}>
                        <Link
                          to={(tool as { slug: string; isLanding?: boolean; isComparison?: boolean }).isComparison ? `/compare/${tool.slug}` : (tool as { slug: string; isLanding?: boolean }).isLanding ? `/${tool.slug}` : `/tools/${tool.slug}`}
                          className="text-sm text-slate-600 transition-colors hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
                        >
                          {tool.label}
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
