// Cache key prefix for localStorage
const TRANSLATION_CACHE_PREFIX = 'tqc_translations_';
const CACHE_VERSION = 'v5'; // Bumped version for lazy loading

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
