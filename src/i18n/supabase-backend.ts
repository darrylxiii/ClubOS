import { supabase } from '@/integrations/supabase/client';
import type { BackendModule, ReadCallback } from 'i18next';
import { getCachedTranslations, setCachedTranslations } from './config';

class SupabaseBackend implements BackendModule {
  static type = 'backend' as const;
  type = 'backend' as const;

  init() {
    // No initialization needed
  }

  async read(language: string, namespace: string, callback: ReadCallback) {
    try {
      console.log(`[i18n Backend] Loading: ${language}/${namespace}`);

      // Check localStorage cache first
      const cached = getCachedTranslations(language, namespace);
      if (cached) {
        console.log(`[i18n Backend] ✓ Cache hit: ${language}/${namespace}`);
        callback(null, cached);
        return;
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('translations')
        .select('translations')
        .eq('namespace', namespace)
        .eq('language', language)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(`[i18n Backend] Error loading ${language}/${namespace}:`, error);
        return this.loadFallback(namespace, language, callback);
      }

      if (!data || !data.translations) {
        console.warn(`[i18n Backend] No data for ${language}/${namespace}, using fallback`);
        return this.loadFallback(namespace, language, callback);
      }

      const translations = data.translations as Record<string, any>;
      
      // Cache the result
      setCachedTranslations(language, namespace, translations);
      
      console.log(`[i18n Backend] ✓ Loaded from DB: ${language}/${namespace} (${Object.keys(translations).length} keys)`);
      callback(null, translations);
    } catch (error) {
      console.error(`[i18n Backend] Failed to load ${language}/${namespace}:`, error);
      this.loadFallback(namespace, language, callback);
    }
  }

  private async loadFallback(namespace: string, requestedLanguage: string, callback: ReadCallback) {
    // If already requesting English, don't fallback again
    if (requestedLanguage === 'en') {
      console.warn(`[i18n Backend] No English fallback available for ${namespace}`);
      callback(null, {}); // Return empty object instead of error to prevent crashes
      return;
    }

    try {
      console.log(`[i18n Backend] Loading English fallback for ${namespace}`);
      
      // Check cache for English
      const cached = getCachedTranslations('en', namespace);
      if (cached) {
        console.log(`[i18n Backend] ✓ Cache hit (fallback): en/${namespace}`);
        callback(null, cached);
        return;
      }

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('translations')
        .select('translations')
        .eq('namespace', namespace)
        .eq('language', 'en')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError || !fallbackData) {
        console.error(`[i18n Backend] Failed to load English fallback for ${namespace}:`, fallbackError);
        callback(null, {}); // Return empty object
        return;
      }

      const translations = fallbackData.translations as Record<string, any>;
      
      // Cache the English fallback
      setCachedTranslations('en', namespace, translations);
      
      console.log(`[i18n Backend] ✓ Loaded English fallback for ${namespace}`);
      callback(null, translations);
    } catch (error) {
      console.error(`[i18n Backend] Error loading fallback for ${namespace}:`, error);
      callback(null, {}); // Return empty object
    }
  }
}

export default SupabaseBackend;
