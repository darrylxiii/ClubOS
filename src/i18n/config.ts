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
const CACHE_VERSION = 'v2';

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

i18n
  .use(SupabaseBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
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
    
    // Load namespaces on demand
    partialBundledLanguages: true,
    
    // Don't use internal cache - we manage our own
    load: 'currentOnly',
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
