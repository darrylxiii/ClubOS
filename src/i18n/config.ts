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

// Core namespaces bundled for immediate display (most commonly used)
const CORE_NAMESPACES = ['common', 'auth', 'onboarding'];

// Lazy-loaded namespaces (admin/power-user features)
const LAZY_NAMESPACES = [
  'admin', 'analytics', 'compliance', 'contracts',
  'candidates', 'jobs', 'meetings', 'messages', 'partner', 'settings'
];

const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'];

import { clearTranslationCache } from './cache';

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
// BUNDLED ENGLISH FALLBACKS - Only core namespaces bundled for fast initial load
// =============================================================================
import commonEn from '@/i18n/locales/en/common.json';
import authEn from '@/i18n/locales/en/auth.json';
import onboardingEn from '@/i18n/locales/en/onboarding.json';

// Bundled Dutch translations (core only)
import authNl from '@/i18n/locales/nl/auth.json';

// Core English translations bundled locally - instant fallback
const bundledResources = {
  en: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
  },
  nl: {
    auth: authNl,
  }
};

// Lazy namespace loaders - dynamically import when needed
const lazyNamespaceLoaders: Record<string, () => Promise<Record<string, any>>> = {
  admin: () => import('@/i18n/locales/en/admin.json').then(m => m.default),
  analytics: () => import('@/i18n/locales/en/analytics.json').then(m => m.default),
  candidates: () => import('@/i18n/locales/en/candidates.json').then(m => m.default),
  compliance: () => import('@/i18n/locales/en/compliance.json').then(m => m.default),
  contracts: () => import('@/i18n/locales/en/contracts.json').then(m => m.default),
  jobs: () => import('@/i18n/locales/en/jobs.json').then(m => m.default),
  meetings: () => import('@/i18n/locales/en/meetings.json').then(m => m.default),
  messages: () => import('@/i18n/locales/en/messages.json').then(m => m.default),
  partner: () => import('@/i18n/locales/en/partner.json').then(m => m.default),
  settings: () => import('@/i18n/locales/en/settings.json').then(m => m.default),
};

// Track which namespaces have been loaded
const loadedNamespaces = new Set<string>(CORE_NAMESPACES);

// Load a lazy namespace on demand
export const loadNamespace = async (namespace: string): Promise<void> => {
  if (loadedNamespaces.has(namespace)) return;

  const loader = lazyNamespaceLoaders[namespace];
  if (!loader) {
    console.warn(`[i18n] No loader for namespace: ${namespace}`);
    return;
  }

  try {
    const translations = await loader();
    i18n.addResourceBundle('en', namespace, translations, true, true);
    loadedNamespaces.add(namespace);
    console.log(`[i18n] Lazy-loaded namespace: ${namespace}`);
  } catch (error) {
    console.error(`[i18n] Failed to load namespace ${namespace}:`, error);
  }
};

// Preload namespaces for a specific route
export const preloadNamespacesForRoute = async (pathname: string): Promise<void> => {
  const namespacesToLoad: string[] = [];

  if (pathname.startsWith('/admin')) {
    namespacesToLoad.push('admin', 'analytics', 'compliance');
  } else if (pathname.startsWith('/jobs') || pathname.startsWith('/roles')) {
    namespacesToLoad.push('jobs', 'candidates');
  } else if (pathname.startsWith('/settings')) {
    namespacesToLoad.push('settings');
  } else if (pathname.startsWith('/messages') || pathname.startsWith('/communications')) {
    namespacesToLoad.push('messages');
  } else if (pathname.startsWith('/meetings') || pathname.startsWith('/calendar')) {
    namespacesToLoad.push('meetings');
  } else if (pathname.startsWith('/contracts')) {
    namespacesToLoad.push('contracts');
  } else if (pathname.startsWith('/partner')) {
    namespacesToLoad.push('partner');
  }

  await Promise.all(namespacesToLoad.map(loadNamespace));
};

i18n
  .use(SupabaseBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: bundledResources, // Only core bundled namespaces
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
      if (process.env.NODE_ENV === 'development') {
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
export { ALL_NAMESPACES, CORE_NAMESPACES, LAZY_NAMESPACES, SUPPORTED_LANGUAGES };
