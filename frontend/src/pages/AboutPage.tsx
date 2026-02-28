import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

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
          <li><strong>Private & Secure</strong> — Files are auto-deleted within 2 hours.</li>
          <li><strong>Fast Processing</strong> — Server-side processing for reliable results.</li>
          <li><strong>Works Everywhere</strong> — Desktop, tablet, or mobile.</li>
        </ul>

        <h2>Available Tools</h2>
        <ul>
          <li>PDF to Word Converter</li>
          <li>Word to PDF Converter</li>
          <li>PDF Compressor</li>
          <li>Image Format Converter</li>
          <li>Video to GIF Creator</li>
          <li>Word Counter</li>
          <li>Text Cleaner & Formatter</li>
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
