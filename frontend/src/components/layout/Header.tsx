import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Coins, ArrowRight, Layers3, Menu, Moon, Sparkles, Sun, UserRound, X } from 'lucide-react';
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
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

const NAV_LINKS = [
  { to: '/tools', key: 'common.allTools', fallback: 'All tools' },
  { to: '/pricing', key: 'common.pricing', fallback: 'Pricing' },
  { to: '/developers', key: 'common.developers', fallback: 'Developers' },
  { to: '/about', key: 'common.about', fallback: 'About' },
  { to: '/contact', key: 'common.contact', fallback: 'Contact' },
] as const;

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
  const location = useLocation();
  const navigate = useNavigate();
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

  useEffect(() => {
    setMobileOpen(false);
    setLangOpen(false);
  }, [location.pathname]);

  const switchLang = async (code: string) => {
    const resolved = await ensureLanguageResources(code);
    const toolRouteMatch = location.pathname.match(/^\/(?:(ar|fr|es)\/)?tools\/([^/]+)\/?$/);

    if (toolRouteMatch) {
      const toolSlug = toolRouteMatch[2];
      const nextPath = resolved === 'en' ? `/tools/${toolSlug}` : `/${resolved}/tools/${toolSlug}`;

      if (nextPath !== location.pathname) {
        navigate(nextPath);
      }
    }

    void i18n.changeLanguage(resolved);
    setLangOpen(false);
  };

  const desktopNavClassName = ({ isActive }: { isActive: boolean }) =>
    [
      'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
      isActive
        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950'
        : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    ].join(' ');

  const mobileNavClassName = ({ isActive }: { isActive: boolean }) =>
    [
      'block rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
      isActive
        ? 'bg-primary-600 text-white shadow-sm shadow-primary-200 dark:shadow-primary-950/30'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    ].join(' ');

  return (
    <header className="sticky-header-safe sticky top-0 z-50 border-b border-slate-200/70 bg-white/78 backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-950/78">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-sky-500 to-accent-500 shadow-lg shadow-primary-200/70 transition-transform duration-300 group-hover:-translate-y-0.5 dark:shadow-primary-950/40">
              <Layers3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-lg font-black tracking-tight text-slate-950 dark:text-white">
                {t('common.appName')}
              </span>
              <span className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
                {t('common.siteTagline')}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm lg:flex dark:border-slate-700/70 dark:bg-slate-900/70">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={desktopNavClassName}>
                {t(link.key, link.fallback)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/account"
            className="hidden max-w-[220px] items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white lg:flex dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <UserRound className="h-4 w-4 shrink-0" />
            <span className="truncate">{user?.email || t('common.account')}</span>
            {user && credits ? (
              <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                <Coins className="h-3 w-3" />
                {credits.credits_remaining}
              </span>
            ) : null}
          </Link>

          {!user ? (
            <Link
              to="/account"
              className="hidden items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-600 lg:inline-flex dark:bg-white dark:text-slate-950 dark:hover:bg-primary-300"
            >
              <Sparkles className="h-4 w-4" />
              {t('home.startFree')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          <button
            onClick={toggleDark}
            className="flex items-center justify-center rounded-full border border-transparent p-2.5 text-slate-500 transition-colors hover:border-slate-200 hover:bg-white dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900"
            aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
            title={isDark ? t('common.lightMode') : t('common.darkMode')}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((value) => !value)}
              className="flex items-center gap-1.5 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-200 hover:bg-white dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              aria-label={t('common.language')}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              <span className="text-lg leading-none">{currentLang.flag}</span>
              <span className="hidden sm:inline">{currentLang.label}</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
            </button>

            {langOpen ? (
              <div className="absolute end-0 top-full z-50 mt-2 w-48 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/30">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => void switchLang(lang.code)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      lang.code === i18n.language
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                    role="option"
                    aria-selected={lang.code === i18n.language}
                  >
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span>{lang.label}</span>
                    {lang.code === i18n.language ? (
                      <span className="ms-auto text-primary-600 dark:text-primary-400">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="flex items-center justify-center rounded-full border border-transparent p-2.5 text-slate-500 transition-colors hover:border-slate-200 hover:bg-white lg:hidden dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-slate-200/70 bg-white/92 px-4 pb-5 pt-3 lg:hidden dark:border-slate-700/60 dark:bg-slate-950/92">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={mobileNavClassName}>
                {t(link.key, link.fallback)}
              </NavLink>
            ))}

            <Link
              to="/account"
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <span>{user?.email || t('common.account')}</span>
              {user && credits ? (
                <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <Coins className="h-3 w-3" />
                  {credits.credits_remaining}
                </span>
              ) : null}
            </Link>

            {!user ? (
              <Link
                to="/account"
                className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
              >
                {t('home.startFree', 'Start Free')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
