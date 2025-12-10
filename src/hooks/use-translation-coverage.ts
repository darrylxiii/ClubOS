import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CoverageSummary {
  byNamespace: Record<string, { translated: number; total: number; percentage: number }>;
  byLanguage: Record<string, { translated: number; total: number; percentage: number }>;
  missingKeys: Array<{ namespace: string; key: string; missingIn: string[] }>;
  overallCompletion: number;
}

// Helper to flatten nested translation object to dot-notation keys
function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  
  Object.entries(obj || {}).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  });
  
  return keys;
}

/**
 * Hook to analyze translation coverage across languages and namespaces
 * Uses English as source of truth and compares other languages
 */
export const useTranslationCoverage = () => {
  return useQuery({
    queryKey: ['translation-coverage-analysis'],
    queryFn: async (): Promise<CoverageSummary> => {
      // Fetch all active translations
      const { data: translations, error } = await supabase
        .from('translations')
        .select('namespace, language, translations')
        .eq('is_active', true);

      if (error) throw error;

      // Use English as the source of truth for expected keys
      const englishTranslations = translations?.filter(t => t.language === 'en') || [];
      const otherTranslations = translations?.filter(t => t.language !== 'en') || [];

      // Count keys per namespace from English
      const expectedKeysByNamespace: Record<string, Set<string>> = {};
      
      englishTranslations.forEach(t => {
        const keys = flattenKeys(t.translations as Record<string, any>);
        expectedKeysByNamespace[t.namespace] = new Set(keys);
      });

      // Calculate coverage by namespace
      const byNamespace: Record<string, { translated: number; total: number; percentage: number }> = {};
      const byLanguage: Record<string, { translated: number; total: number; percentage: number }> = {};
      const missingKeys: Array<{ namespace: string; key: string; missingIn: string[] }> = [];

      // Initialize English as 100% complete
      byLanguage['en'] = { translated: 0, total: 0, percentage: 100 };
      englishTranslations.forEach(t => {
        const keyCount = flattenKeys(t.translations as Record<string, any>).length;
        byLanguage['en'].translated += keyCount;
        byLanguage['en'].total += keyCount;
        
        if (!byNamespace[t.namespace]) {
          byNamespace[t.namespace] = { translated: 0, total: 0, percentage: 0 };
        }
        // Total = English keys × 8 languages
        byNamespace[t.namespace].total += keyCount * 8;
        byNamespace[t.namespace].translated += keyCount; // English is complete
      });

      // Track missing keys per namespace/key
      const missingKeyMap: Record<string, Set<string>> = {};

      // Calculate coverage for other languages
      const languages = ['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'];
      
      languages.forEach(lang => {
        byLanguage[lang] = { translated: 0, total: 0, percentage: 0 };
        
        Object.entries(expectedKeysByNamespace).forEach(([ns, expectedKeys]) => {
          const langTranslation = otherTranslations.find(t => t.namespace === ns && t.language === lang);
          const langKeys = langTranslation ? new Set(flattenKeys(langTranslation.translations as Record<string, any>)) : new Set<string>();
          
          byLanguage[lang].total += expectedKeys.size;
          byLanguage[lang].translated += langKeys.size;

          if (byNamespace[ns]) {
            byNamespace[ns].translated += langKeys.size;
          }

          // Track missing keys
          expectedKeys.forEach(key => {
            if (!langKeys.has(key)) {
              const fullKey = `${ns}:${key}`;
              if (!missingKeyMap[fullKey]) {
                missingKeyMap[fullKey] = new Set();
              }
              missingKeyMap[fullKey].add(lang);
            }
          });
        });

        // Calculate percentage
        if (byLanguage[lang].total > 0) {
          byLanguage[lang].percentage = (byLanguage[lang].translated / byLanguage[lang].total) * 100;
        }
      });

      // Calculate namespace percentages
      Object.keys(byNamespace).forEach(ns => {
        if (byNamespace[ns].total > 0) {
          byNamespace[ns].percentage = (byNamespace[ns].translated / byNamespace[ns].total) * 100;
        }
      });

      // Convert missing key map to array
      Object.entries(missingKeyMap).forEach(([fullKey, langs]) => {
        const [namespace, ...keyParts] = fullKey.split(':');
        missingKeys.push({
          namespace,
          key: keyParts.join(':'),
          missingIn: Array.from(langs),
        });
      });

      // Calculate overall completion
      let totalTranslated = 0;
      let totalExpected = 0;
      Object.values(byLanguage).forEach(lang => {
        totalTranslated += lang.translated;
        totalExpected += lang.total;
      });
      const overallCompletion = totalExpected > 0 ? (totalTranslated / totalExpected) * 100 : 0;

      return {
        byNamespace,
        byLanguage,
        missingKeys: missingKeys.slice(0, 100), // Limit to 100 for performance
        overallCompletion,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
