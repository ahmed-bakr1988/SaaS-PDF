import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FILE_RETENTION_MINUTES } from '@/config/toolLimits';

const LAST_UPDATED = '2026-03-06';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('common.terms')} — {t('common.appName')}</title>
        <meta name="description" content="Terms of service for our online tools." />
      </Helmet>

      <div className="prose mx-auto max-w-2xl dark:prose-invert">
        <h1>{t('common.terms')}</h1>
        <p><em>Last updated: {LAST_UPDATED}</em></p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using SaaS-PDF, you agree to be bound by these Terms of
          Service. If you do not agree, please discontinue use immediately.
        </p>

        <h2>2. Service Description</h2>
        <p>
          SaaS-PDF provides free online tools for file conversion, compression,
          and transformation. The service is provided &ldquo;as is&rdquo; without
          warranties of any kind.
        </p>

        <h2>3. Acceptable Use</h2>
        <ul>
          <li>You may only upload files that you have the right to process.</li>
          <li>You must not upload malicious, illegal, or copyrighted content without authorization.</li>
          <li>Automated or excessive use of the service is prohibited.</li>
        </ul>

        <h2>4. File Handling</h2>
        <ul>
          <li>All uploaded and processed files are automatically deleted within {FILE_RETENTION_MINUTES} minutes.</li>
          <li>We are not responsible for any data loss during processing.</li>
          <li>You are responsible for maintaining your own file backups.</li>
        </ul>

        <h2>5. Limitation of Liability</h2>
        <p>
          SaaS-PDF shall not be liable for any direct, indirect, incidental, or
          consequential damages resulting from the use or inability to use the
          service.
        </p>

        <h2>6. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of
          the service after changes constitutes acceptance of the updated terms.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about these terms? Contact us at{' '}
          <a href="mailto:support@example.com">support@example.com</a>.
        </p>
      </div>
    </>
  );
}
