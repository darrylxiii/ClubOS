import { supabase } from '@/integrations/supabase/client';
import type { BackendModule, ReadCallback } from 'i18next';
import { getCachedTranslations, setCachedTranslations } from './config';
import { logger } from '@/lib/logger';

/**
 * Deep-merge translation objects so partial DB/cache payloads cannot wipe
 * whole sections loaded from locale JSON (i18next's backend path uses a
 * shallow merge at the store level).
 */
function deepMergeTranslations(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const b = base[key];
    const o = override[key];
    if (
      o !== null &&
      typeof o === 'object' &&
      !Array.isArray(o) &&
      b !== null &&
      typeof b === 'object' &&
      !Array.isArray(b)
    ) {
      out[key] = deepMergeTranslations(b as Record<string, unknown>, o as Record<string, unknown>);
    } else {
      out[key] = o;
    }
  }
  return out;
}

async function loadLocalNamespace(language: string, namespace: string): Promise<Record<string, unknown>> {
  try {
    const mod = await import(`@/i18n/locales/${language}/${namespace}.json`);
    return (mod.default || mod) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** DB/cache wins on conflicts; locale JSON fills missing keys and nested leaves. */
async function mergeRemoteWithLocal(
  language: string,
  namespace: string,
  remote: Record<string, unknown> | null | undefined,
): Promise<Record<string, unknown>> {
  const local = await loadLocalNamespace(language, namespace);
  if (!remote || Object.keys(remote).length === 0) {
    return local;
  }
  return deepMergeTranslations(local, remote);
}

/**
 * Enterprise-grade Supabase Backend for i18next
 *
 * Multi-level fallback chain:
 * 1. Local bundled English (immediate, always works) - handled by i18next config
 * 2. localStorage cache (fast, 1-hour validity) — merged with locale files
 * 3. Supabase database (source of truth for non-English) — merged with locale files
 * 4. English fallback from database (if non-English fails)
 * 5. Return empty object (let i18next use bundled resources)
 */
class SupabaseBackend implements BackendModule {
  static type = 'backend' as const;
  type = 'backend' as const;

  init() {
    logger.info('[i18n Backend] Initialized with multi-level fallback');
  }

  async read(language: string, namespace: string, callback: ReadCallback) {
    try {
      // For English, the bundled resources in config.ts are the source of truth
      // Only fetch from DB if we want to override with newer translations
      if (language === 'en') {
        // Check localStorage cache first for any DB overrides
        const cached = getCachedTranslations(language, namespace);
        if (cached && Object.keys(cached).length > 0) {
          const merged = await mergeRemoteWithLocal(language, namespace, cached);
          logger.debug(`[i18n Backend] ✓ Cache hit merged: en/${namespace}`);
          callback(null, merged);
          return;
        }

        // Try to fetch from DB (might have newer translations than bundled)
        try {
          const dbResult = await this.fetchFromDatabase('en', namespace);
          if (dbResult && Object.keys(dbResult).length > 0) {
            const merged = await mergeRemoteWithLocal(language, namespace, dbResult);
            setCachedTranslations(language, namespace, merged);
            logger.debug(`[i18n Backend] ✓ DB override merged for en/${namespace}`);
            callback(null, merged);
            return;
          }
        } catch {
          // DB fetch failed, but bundled resources will be used automatically
          logger.debug(`[i18n Backend] Using bundled resources for en/${namespace}`);
        }

        // Return empty - i18next will use bundled English resources
        callback(null, {});
        return;
      }

      // For non-English languages: cache → database → English fallback
      logger.debug(`[i18n Backend] Loading: ${language}/${namespace}`);

      // Level 2: Check localStorage cache
      const cached = getCachedTranslations(language, namespace);
      if (cached && Object.keys(cached).length > 0) {
        const merged = await mergeRemoteWithLocal(language, namespace, cached);
        logger.debug(`[i18n Backend] ✓ Cache hit merged: ${language}/${namespace}`);
        callback(null, merged);
        return;
      }

      // Level 3: Fetch from Supabase database
      const dbResult = await this.fetchFromDatabase(language, namespace);
      if (dbResult && Object.keys(dbResult).length > 0) {
        const merged = await mergeRemoteWithLocal(language, namespace, dbResult);
        setCachedTranslations(language, namespace, merged);
        logger.debug(`[i18n Backend] ✓ Loaded from DB merged: ${language}/${namespace}`);
        callback(null, merged);
        return;
      }

      // Level 4: Try English fallback from database
      logger.debug(`[i18n Backend] No data for ${language}/${namespace}, trying English fallback...`);
      const englishFallback = await this.fetchFromDatabase('en', namespace);
      if (englishFallback && Object.keys(englishFallback).length > 0) {
        const merged = await mergeRemoteWithLocal(language, namespace, englishFallback);
        setCachedTranslations(language, namespace, merged);
        logger.debug(`[i18n Backend] ✓ Using English fallback merged for ${language}/${namespace}`);
        callback(null, merged);
        return;
      }

      // Level 5: Locale files only (no DB row)
      const localOnly = await loadLocalNamespace(language, namespace);
      if (localOnly && Object.keys(localOnly).length > 0) {
        logger.debug(`[i18n Backend] ✓ Using locale files only for ${language}/${namespace}`);
        callback(null, localOnly);
        return;
      }

      logger.debug(`[i18n Backend] No translations found, using bundled fallback for ${namespace}`);
      callback(null, {});
    } catch (error) {
      logger.error(`[i18n Backend] Error loading ${language}/${namespace}:`, error);
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
        logger.warn(`[i18n Backend] DB error for ${language}/${namespace}`, { error: error.message });
        return null;
      }

      if (!data || !data.translations) {
        return null;
      }

      return data.translations as Record<string, any>;
    } catch (error) {
      logger.warn(`[i18n Backend] Failed to fetch ${language}/${namespace}:`, error);
      return null;
    }
  }
}

export default SupabaseBackend;
