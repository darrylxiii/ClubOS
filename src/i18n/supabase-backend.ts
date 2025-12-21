import { supabase } from '@/integrations/supabase/client';
import type { BackendModule, ReadCallback } from 'i18next';
import { getCachedTranslations, setCachedTranslations } from './config';

/**
 * Enterprise-grade Supabase Backend for i18next
 * 
 * Multi-level fallback chain:
 * 1. Local bundled English (immediate, always works) - handled by i18next config
 * 2. localStorage cache (fast, 1-hour validity)
 * 3. Supabase database (source of truth for non-English)
 * 4. English fallback from database (if non-English fails)
 * 5. Return empty object (let i18next use bundled resources)
 */
class SupabaseBackend implements BackendModule {
  static type = 'backend' as const;
  type = 'backend' as const;

  init() {
    console.log('[i18n Backend] Initialized with multi-level fallback');
  }

  async read(language: string, namespace: string, callback: ReadCallback) {
    try {
      // For English, the bundled resources in config.ts are the source of truth
      // Only fetch from DB if we want to override with newer translations
      if (language === 'en') {
        // Check localStorage cache first for any DB overrides
        const cached = getCachedTranslations(language, namespace);
        if (cached && Object.keys(cached).length > 0) {
          console.log(`[i18n Backend] ✓ Cache hit: en/${namespace} (${Object.keys(cached).length} keys)`);
          callback(null, cached);
          return;
        }

        // Try to fetch from DB (might have newer translations than bundled)
        try {
          const dbResult = await this.fetchFromDatabase('en', namespace);
          if (dbResult && Object.keys(dbResult).length > 0) {
            setCachedTranslations('en', namespace, dbResult);
            console.log(`[i18n Backend] ✓ DB override for en/${namespace} (${Object.keys(dbResult).length} keys)`);
            callback(null, dbResult);
            return;
          }
        } catch {
          // DB fetch failed, but bundled resources will be used automatically
          console.log(`[i18n Backend] Using bundled resources for en/${namespace}`);
        }

        // Return empty - i18next will use bundled English resources
        callback(null, {});
        return;
      }

      // For non-English languages: cache → database → English fallback
      console.log(`[i18n Backend] Loading: ${language}/${namespace}`);

      // Level 2: Check localStorage cache
      const cached = getCachedTranslations(language, namespace);
      if (cached && Object.keys(cached).length > 0) {
        console.log(`[i18n Backend] ✓ Cache hit: ${language}/${namespace} (${Object.keys(cached).length} keys)`);
        callback(null, cached);
        return;
      }

      // Level 3: Fetch from Supabase database
      const dbResult = await this.fetchFromDatabase(language, namespace);
      if (dbResult && Object.keys(dbResult).length > 0) {
        setCachedTranslations(language, namespace, dbResult);
        console.log(`[i18n Backend] ✓ Loaded from DB: ${language}/${namespace} (${Object.keys(dbResult).length} keys)`);
        callback(null, dbResult);
        return;
      }

      // Level 4: Try English fallback from database
      console.log(`[i18n Backend] No data for ${language}/${namespace}, trying English fallback...`);
      const englishFallback = await this.fetchFromDatabase('en', namespace);
      if (englishFallback && Object.keys(englishFallback).length > 0) {
        // Cache the English fallback under the requested language temporarily
        // This prevents repeated DB calls for missing translations
        setCachedTranslations(language, namespace, englishFallback);
        console.log(`[i18n Backend] ✓ Using English fallback for ${language}/${namespace}`);
        callback(null, englishFallback);
        return;
      }

      // Level 5: Return empty - i18next will use bundled English resources
      console.log(`[i18n Backend] No translations found, using bundled fallback for ${namespace}`);
      callback(null, {});

    } catch (error) {
      console.error(`[i18n Backend] Error loading ${language}/${namespace}:`, error);
      // Return empty object instead of error - let bundled resources handle it
      callback(null, {});
    }
  }

  /**
   * Fetch translations from Supabase database
   */
  private async fetchFromDatabase(language: string, namespace: string): Promise<Record<string, any> | null> {
    try {
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
        console.warn(`[i18n Backend] DB error for ${language}/${namespace}:`, error.message);
        return null;
      }

      if (!data || !data.translations) {
        return null;
      }

      return data.translations as Record<string, any>;
    } catch (error) {
      console.warn(`[i18n Backend] Failed to fetch ${language}/${namespace}:`, error);
      return null;
    }
  }
}

export default SupabaseBackend;
