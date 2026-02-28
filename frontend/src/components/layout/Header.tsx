import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Globe } from 'lucide-react';

export default function Header() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
          <FileText className="h-7 w-7" />
          <span>{t('common.appName')}</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600"
          >
            {t('common.home')}
          </Link>
          <Link
            to="/about"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600"
          >
            {t('common.about')}
          </Link>
        </nav>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          aria-label={t('common.language')}
        >
          <Globe className="h-4 w-4" />
          <span>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>
    </header>
  );
}
