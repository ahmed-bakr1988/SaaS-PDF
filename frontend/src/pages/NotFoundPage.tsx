import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>404 — {t('common.appName')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-7xl font-bold text-primary-600">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Page Not Found
        </h1>
        <p className="mt-2 text-slate-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="btn-primary mt-8 inline-flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          {t('common.home')}
        </Link>
      </div>
    </>
  );
}
