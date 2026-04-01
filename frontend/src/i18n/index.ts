import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';

type SupportedLanguage = 'en' | 'ar' | 'fr';

const loadedLanguages = new Set<SupportedLanguage>(['en']);

const languageLoaders: Record<Exclude<SupportedLanguage, 'en'>, () => Promise<{ default: Record<string, unknown> }>> = {
  ar: () => import('./ar.json'),
  fr: () => import('./fr.json'),
};

function normalizeLanguage(language?: string): SupportedLanguage {
  const base = (language || '').split('-')[0];
  return base === 'ar' || base === 'fr' ? base : 'en';
}

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const htmlLanguage = normalizeLanguage(document.documentElement.lang);
  if (htmlLanguage !== 'en') {
    return htmlLanguage;
  }

  try {
    const stored = localStorage.getItem('i18nextLng');
    const fromStorage = normalizeLanguage(stored || undefined);
    if (fromStorage !== 'en') {
      return fromStorage;
    }
  } catch {
    // no-op
  }

  return normalizeLanguage(navigator.language);
}

export async function ensureLanguageResources(language: string) {
  const normalized = normalizeLanguage(language);
  if (normalized === 'en' || loadedLanguages.has(normalized)) {
    return normalized;
  }

  const module = await languageLoaders[normalized]();
  i18n.addResourceBundle(normalized, 'translation', module.default, true, true);
  loadedLanguages.add(normalized);
  return normalized;
}

const initialLanguage = getInitialLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'fr'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
  });

if (initialLanguage !== 'en') {
  void ensureLanguageResources(initialLanguage).then((resolved) => {
    if (i18n.language !== resolved) {
      void i18n.changeLanguage(resolved);
    }
  });
}

export default i18n;
