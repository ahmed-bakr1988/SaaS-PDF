import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook that manages the HTML dir attribute based on current language.
 */
export function useDirection() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    const lang = i18n.language;

    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [i18n.language, isRTL]);

  return { isRTL, language: i18n.language };
}
