import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FILE_RETENTION_MINUTES } from '@/config/toolLimits';

const LAST_UPDATED = '2026-03-06';
const CONTACT_EMAIL = 'support@saas-pdf.com';

export default function PrivacyPage() {
  const { t } = useTranslation();
  const fileItems = t('pages.privacy.fileHandlingItems', { minutes: FILE_RETENTION_MINUTES, returnObjects: true }) as string[];
  const thirdPartyItems = t('pages.privacy.thirdPartyItems', { returnObjects: true }) as string[];

  return (
    <>
      <Helmet>
        <title>{t('pages.privacy.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('pages.privacy.metaDescription')} />
        <link rel="canonical" href={`${window.location.origin}/privacy`} />
      </Helmet>

      <div className="prose mx-auto max-w-2xl dark:prose-invert">
        <h1>{t('pages.privacy.title')}</h1>
        <p><em>{t('pages.privacy.lastUpdated', { date: LAST_UPDATED })}</em></p>

        <h2>{t('pages.privacy.dataCollectionTitle')}</h2>
        <p>{t('pages.privacy.dataCollectionText')}</p>

        <h2>{t('pages.privacy.fileHandlingTitle')}</h2>
        {Array.isArray(fileItems) && (
          <ul>
            {fileItems.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        )}

        <h2>{t('pages.privacy.cookiesTitle')}</h2>
        <p>{t('pages.privacy.cookiesText')}</p>

        <h2>{t('pages.privacy.thirdPartyTitle')}</h2>
        {Array.isArray(thirdPartyItems) && (
          <ul>
            {thirdPartyItems.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        )}

        <h2>{t('pages.privacy.securityTitle')}</h2>
        <p>{t('pages.privacy.securityText')}</p>

        <h2>{t('pages.privacy.rightsTitle')}</h2>
        <p>{t('pages.privacy.rightsText', { minutes: FILE_RETENTION_MINUTES })}</p>

        <h2>{t('pages.privacy.contactTitle')}</h2>
        <p>
          {t('pages.privacy.contactText')}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </>
  );
}
