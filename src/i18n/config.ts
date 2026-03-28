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
const CACHE_VERSION = 'v5'; // Bumped: translation cache must not store partial DB blobs without merge

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
    // PERF: Load the language's locale files on-demand before switching
    await loadLanguageAsync(language);

    // Force reload from Supabase backend for any DB overrides
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
// BUNDLED ENGLISH FALLBACKS — Only a critical slice of 'common' is statically
// bundled (~9KB). The remaining ~640KB of common.json + all other namespaces
// are loaded asynchronously after first paint via loadDeferredEnglish().
// =============================================================================
import commonCritical from '@/i18n/locales/en/common-critical.json';
import authEn from '@/i18n/locales/en/auth.json';

// Only the critical shell is bundled — deferred keys merge in within ~100ms
const bundledResources = {
  en: {
    common: commonCritical,
    auth: authEn,
  },
};

// PERF: Load the full common.json + onboarding asynchronously after first paint
let deferredLoaded = false;
export async function loadDeferredEnglish(): Promise<void> {
  if (deferredLoaded) return;
  deferredLoaded = true;
  try {
    const [commonFull, onboardingEn] = await Promise.all([
      import('@/i18n/locales/en/common.json'),
      import('@/i18n/locales/en/onboarding.json'),
    ]);
    // Deep-merge full common over the critical shell
    i18n.addResourceBundle('en', 'common', commonFull.default || commonFull, true, true);
    i18n.addResourceBundle('en', 'onboarding', onboardingEn.default || onboardingEn, true, true);
  } catch (err) {
    console.warn('[i18n] Failed to load deferred English resources:', err);
  }
}

/**
 * PERF: Dynamic locale loader — loads language JSON files on-demand
 * using Vite's dynamic import(). Files are code-split into separate
 * chunks that are only downloaded when a user actually switches language.
 */

// Track which languages have been loaded to avoid duplicate imports
const loadedLanguages = new Set<string>(['en']);

async function loadAllNamespaces(lang: string): Promise<Record<string, any>> {
  const namespaceImports = ALL_NAMESPACES.map(async (ns) => {
    try {
      const mod = await import(`@/i18n/locales/${lang}/${ns}.json`);
      return [ns, mod.default || mod] as [string, any];
    } catch {
      // Namespace doesn't exist for this language — skip silently
      return [ns, {}] as [string, any];
    }
  });
  
  const results = await Promise.all(namespaceImports);
  const resources: Record<string, any> = {};
  for (const [ns, data] of results) {
    resources[ns] = data;
  }
  return resources;
}

/**
 * Load a language's translations on-demand and register them with i18next.
 * Called automatically on language change. Results are cached in i18next's
 * internal store + localStorage via the Supabase backend.
 */
export async function loadLanguageAsync(lang: string): Promise<void> {
  if (lang === 'en' || loadedLanguages.has(lang)) return;
  
  try {
    const resources = await loadAllNamespaces(lang);
    
    // Register each namespace with i18next
    for (const [ns, data] of Object.entries(resources)) {
      if (data && Object.keys(data).length > 0) {
        i18n.addResourceBundle(lang, ns, data, true, true);
      }
    }
    
    loadedLanguages.add(lang);
  } catch (error) {
    // If local files fail, the Supabase backend will handle it
    console.warn(`[i18n] Failed to load local resources for ${lang}, falling back to Supabase backend`);
  }
}

i18n
  .use(SupabaseBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: bundledResources, // Only English bundled
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

// PERF: Auto-load language on detection/change — ensures non-English 
// languages are fetched before rendering
const detectedLang = i18n.language;
if (detectedLang && detectedLang !== 'en') {
  loadLanguageAsync(detectedLang);
}

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

// Apply RTL for Arabic on language change, load fonts, and lazy-load locale files
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;

  // PERF: Lazy-load locale files for non-English languages
  loadLanguageAsync(lng);

  // Load font dynamically if needed (Chinese, Arabic)
  loadFontForLanguage(lng);
});

export default i18n;
export { ALL_NAMESPACES, SUPPORTED_LANGUAGES };
