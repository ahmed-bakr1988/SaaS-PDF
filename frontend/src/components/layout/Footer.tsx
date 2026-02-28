import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">
              © {new Date().getFullYear()} {t('common.appName')}
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-sm text-slate-500 transition-colors hover:text-primary-600"
            >
              {t('common.privacy')}
            </Link>
            <Link
              to="/terms"
              className="text-sm text-slate-500 transition-colors hover:text-primary-600"
            >
              {t('common.terms')}
            </Link>
            <Link
              to="/about"
              className="text-sm text-slate-500 transition-colors hover:text-primary-600"
            >
              {t('common.about')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
