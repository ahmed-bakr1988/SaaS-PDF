import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FILE_RETENTION_MINUTES } from '@/config/toolLimits';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('common.about')} — {t('common.appName')}</title>
        <meta name="description" content="About our free online file conversion tools." />
      </Helmet>

      <div className="prose mx-auto max-w-2xl dark:prose-invert">
        <h1>{t('common.about')}</h1>

        <p>
          We provide free, fast, and secure online tools for converting, compressing,
          and processing files — PDFs, images, videos, and text.
        </p>

        <h2>Why use our tools?</h2>
        <ul>
          <li><strong>100% Free</strong> — No hidden charges, no sign-up required.</li>
          <li><strong>Private & Secure</strong> — Files are auto-deleted within {FILE_RETENTION_MINUTES} minutes.</li>
          <li><strong>Fast Processing</strong> — Server-side processing for reliable results.</li>
          <li><strong>Works Everywhere</strong> — Desktop, tablet, or mobile.</li>
        </ul>

        <h2>Available Tools</h2>
        <ul>
          <li>PDF conversion tools (PDF↔Word)</li>
          <li>PDF optimization and utility tools (compress, merge, split, rotate, page numbers)</li>
          <li>PDF security tools (watermark, protect, unlock)</li>
          <li>PDF/image conversion tools (PDF→Images, Images→PDF)</li>
          <li>Image processing tools (convert, resize)</li>
          <li>Video to GIF tool</li>
          <li>Text tools (word counter, cleaner)</li>
          <li>PDF to flowchart extraction tool</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Have feedback or feature requests? Reach out at{' '}
          <a href="mailto:support@example.com">support@example.com</a>.
        </p>
      </div>
    </>
  );
}
