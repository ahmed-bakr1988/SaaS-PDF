import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

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
};

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Tool link grid */}
        <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(FOOTER_TOOLS).map(([category, tools]) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                {category}
              </h3>
              <ul className="space-y-2">
                {tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      to={(tool as { slug: string; isLanding?: boolean }).isLanding ? `/${tool.slug}` : `/tools/${tool.slug}`}
                      className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
                    >
                      {tool.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">
                © {new Date().getFullYear()} {t('common.appName')}
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.privacy')}
              </Link>
              <Link
                to="/terms"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.terms')}
              </Link>
              <Link
                to="/tools"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.allTools')}
              </Link>
              <Link
                to="/about"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.about')}
              </Link>
              <Link
                to="/contact"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.contact')}
              </Link>
              <Link
                to="/pricing"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.pricing')}
              </Link>
              <Link
                to="/pricing-transparency"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.pricingTransparency')}
              </Link>
              <Link
                to="/blog"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.blog')}
              </Link>
              <Link
                to="/developers"
                className="text-sm text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                {t('common.developers')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
