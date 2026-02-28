import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('common.privacy')} — {t('common.appName')}</title>
        <meta name="description" content="Privacy policy for our online tools." />
      </Helmet>

      <div className="prose mx-auto max-w-2xl dark:prose-invert">
        <h1>{t('common.privacy')}</h1>
        <p><em>Last updated: {new Date().toISOString().split('T')[0]}</em></p>

        <h2>1. Data Collection</h2>
        <p>
          We only collect files you intentionally upload for processing. We do not
          require registration, and we do not store personal information.
        </p>

        <h2>2. File Processing & Storage</h2>
        <ul>
          <li>Uploaded files are processed on our secure servers.</li>
          <li>All uploaded and output files are <strong>automatically deleted within 2 hours</strong>.</li>
          <li>Files are stored in encrypted cloud storage during processing.</li>
          <li>We do not access, read, or share the content of your files.</li>
        </ul>

        <h2>3. Cookies & Analytics</h2>
        <p>
          We use essential cookies to remember your language preference. We may use
          Google Analytics and Google AdSense, which may place their own cookies.
          You can manage cookie preferences in your browser settings.
        </p>

        <h2>4. Third-Party Services</h2>
        <ul>
          <li><strong>Google AdSense</strong> — for displaying advertisements.</li>
          <li><strong>AWS S3</strong> — for temporary file storage.</li>
        </ul>

        <h2>5. Security</h2>
        <p>
          We employ industry-standard security measures including HTTPS encryption,
          file validation, rate limiting, and automatic file cleanup.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions about this policy? Contact us at{' '}
          <a href="mailto:support@example.com">support@example.com</a>.
        </p>
      </div>
    </>
  );
}
