import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import SupabaseBackend from './supabase-backend';

// All namespaces available in the database
const ALL_NAMESPACES = [
  'common', 'auth', 'onboarding', 'admin', 'analytics',
  'candidates', 'compliance', 'contracts', 'jobs',
  'meetings', 'messages', 'partner', 'settings'
];

const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'];

// Cache key prefix for localStorage
const TRANSLATION_CACHE_PREFIX = 'tqc_translations_';
const CACHE_VERSION = 'v4'; // Bumped version to invalidate old caches

// Get cached translations from localStorage
export const getCachedTranslations = (language: string, namespace: string): Record<string, any> | null => {
  try {
    const key = `${TRANSLATION_CACHE_PREFIX}${CACHE_VERSION}_${language}_${namespace}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 1 hour
      if (Date.now() - timestamp < 3600000) {
        return data;
      }
    }
  } catch (e) {
    console.warn('[i18n] Cache read error:', e);
  }
  return null;
};

// Save translations to localStorage cache
export const setCachedTranslations = (language: string, namespace: string, data: Record<string, any>) => {
  try {
    const key = `${TRANSLATION_CACHE_PREFIX}${CACHE_VERSION}_${language}_${namespace}`;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('[i18n] Cache write error:', e);
  }
};

// Clear all translation caches
export const clearTranslationCache = (language?: string) => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TRANSLATION_CACHE_PREFIX)) {
        if (!language || key.includes(`_${language}_`)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[i18n] Cleared ${keysToRemove.length} cached translations`);
  } catch (e) {
    console.warn('[i18n] Cache clear error:', e);
  }
};

// Force reload all translations for a language
export const forceReloadLanguage = async (language: string): Promise<void> => {
  console.log(`[i18n] Force reloading language: ${language}`);

  // Clear cache for this language
  clearTranslationCache(language);

  // Clear i18next's internal cache for this language
  ALL_NAMESPACES.forEach(ns => {
    if (i18n.hasResourceBundle(language, ns)) {
      i18n.removeResourceBundle(language, ns);
    }
  });

  // Reload all namespaces for this language
  await Promise.all(
    ALL_NAMESPACES.map(ns =>
      i18n.reloadResources(language, ns).catch(err => {
        console.warn(`[i18n] Failed to reload ${language}/${ns}:`, err);
      })
    )
  );

  console.log(`[i18n] Finished reloading ${language}`);
};

// Change language with guaranteed reload
export const changeLanguageWithReload = async (language: string): Promise<boolean> => {
  try {
    console.log(`[i18n] Changing language to: ${language}`);

    // Force reload the new language
    await forceReloadLanguage(language);

    // Change the language
    await i18n.changeLanguage(language);

    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }));

    return true;
  } catch (error) {
    console.error('[i18n] Language change failed:', error);
    return false;
  }
};

// =============================================================================
// BUNDLED ENGLISH FALLBACKS - All 13 namespaces bundled for immediate display
// =============================================================================
import commonEn from '@/i18n/locales/en/common.json';
import authEn from '@/i18n/locales/en/auth.json';
import onboardingEn from '@/i18n/locales/en/onboarding.json';
import adminEn from '@/i18n/locales/en/admin.json';
import analyticsEn from '@/i18n/locales/en/analytics.json';
import candidatesEn from '@/i18n/locales/en/candidates.json';
import complianceEn from '@/i18n/locales/en/compliance.json';
import contractsEn from '@/i18n/locales/en/contracts.json';
import jobsEn from '@/i18n/locales/en/jobs.json';
import meetingsEn from '@/i18n/locales/en/meetings.json';
import messagesEn from '@/i18n/locales/en/messages.json';
import partnerEn from '@/i18n/locales/en/partner.json';
import settingsEn from '@/i18n/locales/en/settings.json';

// Bundled Dutch translations - all 13 namespaces for instant display
import commonNl from '@/i18n/locales/nl/common.json';
import authNl from '@/i18n/locales/nl/auth.json';
import onboardingNl from '@/i18n/locales/nl/onboarding.json';
import adminNl from '@/i18n/locales/nl/admin.json';
import analyticsNl from '@/i18n/locales/nl/analytics.json';
import candidatesNl from '@/i18n/locales/nl/candidates.json';
import complianceNl from '@/i18n/locales/nl/compliance.json';
import contractsNl from '@/i18n/locales/nl/contracts.json';
import jobsNl from '@/i18n/locales/nl/jobs.json';
import meetingsNl from '@/i18n/locales/nl/meetings.json';
import messagesNl from '@/i18n/locales/nl/messages.json';
import partnerNl from '@/i18n/locales/nl/partner.json';
import settingsNl from '@/i18n/locales/nl/settings.json';

// Bundled German translations
import commonDe from '@/i18n/locales/de/common.json';
import authDe from '@/i18n/locales/de/auth.json';
import onboardingDe from '@/i18n/locales/de/onboarding.json';
import adminDe from '@/i18n/locales/de/admin.json';
import analyticsDe from '@/i18n/locales/de/analytics.json';
import candidatesDe from '@/i18n/locales/de/candidates.json';
import complianceDe from '@/i18n/locales/de/compliance.json';
import contractsDe from '@/i18n/locales/de/contracts.json';
import jobsDe from '@/i18n/locales/de/jobs.json';
import meetingsDe from '@/i18n/locales/de/meetings.json';
import messagesDe from '@/i18n/locales/de/messages.json';
import partnerDe from '@/i18n/locales/de/partner.json';
import settingsDe from '@/i18n/locales/de/settings.json';

// Bundled French translations
import commonFr from '@/i18n/locales/fr/common.json';
import authFr from '@/i18n/locales/fr/auth.json';
import onboardingFr from '@/i18n/locales/fr/onboarding.json';
import adminFr from '@/i18n/locales/fr/admin.json';
import analyticsFr from '@/i18n/locales/fr/analytics.json';
import candidatesFr from '@/i18n/locales/fr/candidates.json';
import complianceFr from '@/i18n/locales/fr/compliance.json';
import contractsFr from '@/i18n/locales/fr/contracts.json';
import jobsFr from '@/i18n/locales/fr/jobs.json';
import meetingsFr from '@/i18n/locales/fr/meetings.json';
import messagesFr from '@/i18n/locales/fr/messages.json';
import partnerFr from '@/i18n/locales/fr/partner.json';
import settingsFr from '@/i18n/locales/fr/settings.json';

// Bundled Spanish translations
import commonEs from '@/i18n/locales/es/common.json';
import authEs from '@/i18n/locales/es/auth.json';
import onboardingEs from '@/i18n/locales/es/onboarding.json';
import adminEs from '@/i18n/locales/es/admin.json';
import analyticsEs from '@/i18n/locales/es/analytics.json';
import candidatesEs from '@/i18n/locales/es/candidates.json';
import complianceEs from '@/i18n/locales/es/compliance.json';
import contractsEs from '@/i18n/locales/es/contracts.json';
import jobsEs from '@/i18n/locales/es/jobs.json';
import meetingsEs from '@/i18n/locales/es/meetings.json';
import messagesEs from '@/i18n/locales/es/messages.json';
import partnerEs from '@/i18n/locales/es/partner.json';
import settingsEs from '@/i18n/locales/es/settings.json';

// Bundled Chinese Simplified translations
import commonZh from '@/i18n/locales/zh/common.json';
import authZh from '@/i18n/locales/zh/auth.json';
import onboardingZh from '@/i18n/locales/zh/onboarding.json';
import adminZh from '@/i18n/locales/zh/admin.json';
import analyticsZh from '@/i18n/locales/zh/analytics.json';
import candidatesZh from '@/i18n/locales/zh/candidates.json';
import complianceZh from '@/i18n/locales/zh/compliance.json';
import contractsZh from '@/i18n/locales/zh/contracts.json';
import jobsZh from '@/i18n/locales/zh/jobs.json';
import meetingsZh from '@/i18n/locales/zh/meetings.json';
import messagesZh from '@/i18n/locales/zh/messages.json';
import partnerZh from '@/i18n/locales/zh/partner.json';
import settingsZh from '@/i18n/locales/zh/settings.json';

// Bundled Arabic translations
import commonAr from '@/i18n/locales/ar/common.json';
import authAr from '@/i18n/locales/ar/auth.json';
import onboardingAr from '@/i18n/locales/ar/onboarding.json';
import adminAr from '@/i18n/locales/ar/admin.json';
import analyticsAr from '@/i18n/locales/ar/analytics.json';
import candidatesAr from '@/i18n/locales/ar/candidates.json';
import complianceAr from '@/i18n/locales/ar/compliance.json';
import contractsAr from '@/i18n/locales/ar/contracts.json';
import jobsAr from '@/i18n/locales/ar/jobs.json';
import meetingsAr from '@/i18n/locales/ar/meetings.json';
import messagesAr from '@/i18n/locales/ar/messages.json';
import partnerAr from '@/i18n/locales/ar/partner.json';
import settingsAr from '@/i18n/locales/ar/settings.json';

// Bundled Russian translations
import commonRu from '@/i18n/locales/ru/common.json';
import authRu from '@/i18n/locales/ru/auth.json';
import onboardingRu from '@/i18n/locales/ru/onboarding.json';
import adminRu from '@/i18n/locales/ru/admin.json';
import analyticsRu from '@/i18n/locales/ru/analytics.json';
import candidatesRu from '@/i18n/locales/ru/candidates.json';
import complianceRu from '@/i18n/locales/ru/compliance.json';
import contractsRu from '@/i18n/locales/ru/contracts.json';
import jobsRu from '@/i18n/locales/ru/jobs.json';
import meetingsRu from '@/i18n/locales/ru/meetings.json';
import messagesRu from '@/i18n/locales/ru/messages.json';
import partnerRu from '@/i18n/locales/ru/partner.json';
import settingsRu from '@/i18n/locales/ru/settings.json';

// All translations bundled locally - instant display for all 8 languages
const bundledResources = {
  en: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
    admin: adminEn,
    analytics: analyticsEn,
    candidates: candidatesEn,
    compliance: complianceEn,
    contracts: contractsEn,
    jobs: jobsEn,
    meetings: meetingsEn,
    messages: messagesEn,
    partner: partnerEn,
    settings: settingsEn,
  },
  nl: {
    common: commonNl,
    auth: authNl,
    onboarding: onboardingNl,
    admin: adminNl,
    analytics: analyticsNl,
    candidates: candidatesNl,
    compliance: complianceNl,
    contracts: contractsNl,
    jobs: jobsNl,
    meetings: meetingsNl,
    messages: messagesNl,
    partner: partnerNl,
    settings: settingsNl,
  },
  de: {
    common: commonDe,
    auth: authDe,
    onboarding: onboardingDe,
    admin: adminDe,
    analytics: analyticsDe,
    candidates: candidatesDe,
    compliance: complianceDe,
    contracts: contractsDe,
    jobs: jobsDe,
    meetings: meetingsDe,
    messages: messagesDe,
    partner: partnerDe,
    settings: settingsDe,
  },
  fr: {
    common: commonFr,
    auth: authFr,
    onboarding: onboardingFr,
    admin: adminFr,
    analytics: analyticsFr,
    candidates: candidatesFr,
    compliance: complianceFr,
    contracts: contractsFr,
    jobs: jobsFr,
    meetings: meetingsFr,
    messages: messagesFr,
    partner: partnerFr,
    settings: settingsFr,
  },
  es: {
    common: commonEs,
    auth: authEs,
    onboarding: onboardingEs,
    admin: adminEs,
    analytics: analyticsEs,
    candidates: candidatesEs,
    compliance: complianceEs,
    contracts: contractsEs,
    jobs: jobsEs,
    meetings: meetingsEs,
    messages: messagesEs,
    partner: partnerEs,
    settings: settingsEs,
  },
  zh: {
    common: commonZh,
    auth: authZh,
    onboarding: onboardingZh,
    admin: adminZh,
    analytics: analyticsZh,
    candidates: candidatesZh,
    compliance: complianceZh,
    contracts: contractsZh,
    jobs: jobsZh,
    meetings: meetingsZh,
    messages: messagesZh,
    partner: partnerZh,
    settings: settingsZh,
  },
  ar: {
    common: commonAr,
    auth: authAr,
    onboarding: onboardingAr,
    admin: adminAr,
    analytics: analyticsAr,
    candidates: candidatesAr,
    compliance: complianceAr,
    contracts: contractsAr,
    jobs: jobsAr,
    meetings: meetingsAr,
    messages: messagesAr,
    partner: partnerAr,
    settings: settingsAr,
  },
  ru: {
    common: commonRu,
    auth: authRu,
    onboarding: onboardingRu,
    admin: adminRu,
    analytics: analyticsRu,
    candidates: candidatesRu,
    compliance: complianceRu,
    contracts: contractsRu,
    jobs: jobsRu,
    meetings: meetingsRu,
    messages: messagesRu,
    partner: partnerRu,
    settings: settingsRu,
  },
};

i18n
  .use(SupabaseBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: bundledResources, // All bundled namespaces
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: ALL_NAMESPACES,

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

    // Preload primary language
    preload: ['en'],

    // Allow partial bundles - load other languages from backend
    partialBundledLanguages: true,

    // Only load the current language (not all at once)
    load: 'currentOnly',

    // Return empty string for missing keys (will show bundled English fallback)
    returnEmptyString: false,

    // Log missing keys in development
    saveMissing: false,
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key: ${ns}:${key} for languages: ${lngs.join(', ')}`);
      }
    },
  });

// Font URLs for languages that require special fonts
const LANGUAGE_FONTS: Record<string, string> = {
  zh: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap',
  ar: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
};

// Track loaded fonts to avoid duplicate loads
const loadedFonts = new Set<string>();

// Load font dynamically when needed
const loadFontForLanguage = (lng: string) => {
  const fontUrl = LANGUAGE_FONTS[lng];
  if (fontUrl && !loadedFonts.has(lng)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
    loadedFonts.add(lng);
    console.log(`[i18n] Loaded font for language: ${lng}`);
  }
};

// Apply RTL for Arabic on language change and load fonts dynamically
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;

  // Load font dynamically if needed (Chinese, Arabic)
  loadFontForLanguage(lng);

  console.log(`[i18n] Language changed to: ${lng}`);
});

export default i18n;
export { ALL_NAMESPACES, SUPPORTED_LANGUAGES };
