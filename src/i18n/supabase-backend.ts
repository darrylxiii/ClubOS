import { supabase } from '@/integrations/supabase/client';
import type { BackendModule, ReadCallback } from 'i18next';

class SupabaseBackend implements BackendModule {
  static type = 'backend' as const;
  type = 'backend' as const;

  init() {
    // No initialization needed
  }

  async read(language: string, namespace: string, callback: ReadCallback) {
    try {
      console.log(`Loading translations: ${language}/${namespace}`);

      // Try to load the requested language
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
        console.error(`Error loading ${language}/${namespace}:`, error);
        // Fallback to English
        return this.loadFallback(namespace, callback);
      }

      if (!data) {
        console.warn(`No translation found for ${language}/${namespace}, falling back to English`);
        // Fallback to English
        return this.loadFallback(namespace, callback);
      }

      console.log(`✓ Loaded ${language}/${namespace} from Supabase`);
      callback(null, data.translations as Record<string, any>);
    } catch (error) {
      console.error(`Failed to load translations for ${language}/${namespace}:`, error);
      // Try to fallback to English
      this.loadFallback(namespace, callback);
    }
  }

  private async loadFallback(namespace: string, callback: ReadCallback) {
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('translations')
        .select('translations')
        .eq('namespace', namespace)
        .eq('language', 'en')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (fallbackError || !fallbackData) {
        console.error(`Failed to load English fallback for ${namespace}:`, fallbackError);
        callback(fallbackError || new Error('No fallback found'), null);
        return;
      }

      console.log(`✓ Loaded English fallback for ${namespace}`);
      callback(null, fallbackData.translations as Record<string, any>);
    } catch (error) {
      console.error(`Error loading fallback for ${namespace}:`, error);
      callback(error as Error, null);
    }
  }
}

export default SupabaseBackend;