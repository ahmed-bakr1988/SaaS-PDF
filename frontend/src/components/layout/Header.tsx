import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Moon, Sun, Menu, X, ChevronDown, UserRound, Coins } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ensureLanguageResources } from '@/i18n';
interface LangOption {
  code: string;
  label: string;
  flag: string;
}

const languages: LangOption[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const user = useAuthStore((state) => state.user);
  const credits = useAuthStore((state) => state.credits);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === i18n.language) ?? languages[0];

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const switchLang = async (code: string) => {
    const resolved = await ensureLanguageResources(code);
    void i18n.changeLanguage(resolved);
    setLangOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600 dark:text-primary-400">
          <FileText className="h-7 w-7" />
          <span>{t('common.appName')}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
          >
            {t('common.home')}
          </Link>
          <Link
            to="/about"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
          >
            {t('common.about')}
          </Link>
          <Link
            to="/account"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
          >
            {t('common.account')}
          </Link>
          <Link
            to="/developers"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400"
          >
            {t('common.developers')}
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/account"
            className="hidden max-w-[220px] items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 md:flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <UserRound className="h-4 w-4" />
            <span className="truncate">{user?.email || t('common.account')}</span>
            {user && credits && (
              <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <Coins className="h-3 w-3" />
                {credits.credits_remaining}
              </span>
            )}
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            className="flex items-center justify-center rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
            title={isDark ? t('common.lightMode') : t('common.darkMode')}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Language Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={t('common.language')}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              <span className="text-lg leading-none">{currentLang.flag}</span>
              <span className="hidden sm:inline">{currentLang.label}</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {langOpen && (
              <div className="absolute end-0 top-full z-50 mt-2 w-44 origin-top-right animate-in fade-in slide-in-from-top-2 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => void switchLang(lang.code)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      lang.code === i18n.language
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                    role="option"
                    aria-selected={lang.code === i18n.language}
                  >
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span>{lang.label}</span>
                    {lang.code === i18n.language && (
                      <span className="ms-auto text-primary-600 dark:text-primary-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex items-center justify-center rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden dark:border-slate-700 dark:bg-slate-900">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.home')}
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.about')}
          </Link>
          <Link
            to="/account"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>{user?.email || t('common.account')}</span>
            {user && credits && (
              <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <Coins className="h-3 w-3" />
                {credits.credits_remaining}
              </span>
            )}
          </Link>
          <Link
            to="/developers"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.developers')}
          </Link>
        </nav>
      )}
    </header>
  );
}
