import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { ensureLanguageResources } from '@/i18n';
import { getProgrammaticToolPage, getSeoCollectionPage } from '@/config/seoPages';
import NotFoundPage from '@/pages/NotFoundPage';
import SeoCollectionPage from '@/pages/SeoCollectionPage';
import SeoPage from '@/pages/SeoPage';

type SeoRouteParams = {
  locale?: string;
  slug?: string;
};

export default function SeoRoutePage() {
  const { i18n } = useTranslation();
  const { locale, slug } = useParams<SeoRouteParams>();
  const resolvedLocale = locale === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    if (i18n.language === resolvedLocale) return;

    void (async () => {
      const resolved = await ensureLanguageResources(resolvedLocale);
      await i18n.changeLanguage(resolved);
    })();
  }, [i18n, resolvedLocale]);

  if (!slug) {
    return <NotFoundPage />;
  }

  if (getProgrammaticToolPage(slug)) {
    return <SeoPage slug={slug} />;
  }

  if (getSeoCollectionPage(slug)) {
    return <SeoCollectionPage slug={slug} />;
  }

  return <NotFoundPage />;
}
