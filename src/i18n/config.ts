import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import onboardingEn from './locales/en/onboarding.json';

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
  nl: {
    common: commonEn, // Placeholder - will be AI-translated in Phase 2
    auth: authEn,
    onboarding: onboardingEn,
  },
  de: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
  fr: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
  es: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
  zh: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
  ar: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
  ru: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'onboarding'],
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
