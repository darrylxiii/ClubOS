import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * Hook that sets document dir="rtl" when the current language is RTL.
 * Should be called once in the app root.
 */
export function useRTLSupport() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language?.split('-')[0] || 'en';
    const isRTL = RTL_LANGUAGES.includes(lang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [i18n.language]);
}
