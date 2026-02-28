import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import ar from './ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
