import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FILE_RETENTION_MINUTES } from '@/config/toolLimits';

const LAST_UPDATED = '2026-03-06';
const CONTACT_EMAIL = 'support@saas-pdf.com';

export default function TermsPage() {
  const { t } = useTranslation();
  const useItems = t('pages.terms.useItems', { returnObjects: true }) as string[];
  const fileItems = t('pages.terms.fileItems', { minutes: FILE_RETENTION_MINUTES, returnObjects: true }) as string[];

  return (
    <>
      <Helmet>
        <title>{t('pages.terms.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('pages.terms.metaDescription')} />
        <link rel="canonical" href={`${window.location.origin}/terms`} />
      </Helmet>

      <div className="prose mx-auto max-w-2xl dark:prose-invert">
        <h1>{t('pages.terms.title')}</h1>
        <p><em>{t('pages.terms.lastUpdated', { date: LAST_UPDATED })}</em></p>

        <h2>{t('pages.terms.acceptanceTitle')}</h2>
        <p>{t('pages.terms.acceptanceText')}</p>

        <h2>{t('pages.terms.serviceTitle')}</h2>
        <p>{t('pages.terms.serviceText')}</p>

        <h2>{t('pages.terms.useTitle')}</h2>
        {Array.isArray(useItems) && (
          <ul>
            {useItems.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        )}

        <h2>{t('pages.terms.fileTitle')}</h2>
        {Array.isArray(fileItems) && (
          <ul>
            {fileItems.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        )}

        <h2>{t('pages.terms.liabilityTitle')}</h2>
        <p>{t('pages.terms.liabilityText')}</p>

        <h2>{t('pages.terms.ipTitle')}</h2>
        <p>{t('pages.terms.ipText')}</p>

        <h2>{t('pages.terms.changesTitle')}</h2>
        <p>{t('pages.terms.changesText')}</p>

        <h2>{t('pages.terms.contactTitle')}</h2>
        <p>
          {t('pages.terms.contactText')}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </>
  );
}
