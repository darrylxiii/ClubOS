import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CoverageSummary {
  byNamespace: Record<string, { translated: number; total: number; percentage: number }>;
  byLanguage: Record<string, { translated: number; total: number; percentage: number; qualityScore?: number }>;
  missingKeys: Array<{ namespace: string; key: string; missingIn: string[] }>;
  overallCompletion: number;
  qualitySummary: {
    validated: number;
    needsReview: number;
    pending: number;
    averageQuality: number;
  };
}

// All supported languages (English + 7 others)
const ALL_LANGUAGES = ['en', 'nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'] as const;
const OTHER_LANGUAGES = ['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'] as const;

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
      // Fetch all active translations with quality data
      const { data: translations, error } = await supabase
        .from('translations')
        .select('namespace, language, translations, quality_status, quality_score, translation_provider')
        .eq('is_active', true);

      if (error) throw error;

      // Use English as the source of truth for expected keys
      const englishTranslations = translations?.filter(t => t.language === 'en') || [];
      const otherTranslations = translations?.filter(t => t.language !== 'en') || [];

      // Count keys per namespace from English
      const expectedKeysByNamespace: Record<string, Set<string>> = {};
      let totalEnglishKeys = 0;
      
      englishTranslations.forEach(t => {
        const keys = flattenKeys(t.translations as Record<string, any>);
        expectedKeysByNamespace[t.namespace] = new Set(keys);
        totalEnglishKeys += keys.length;
      });

      // Calculate quality summary
      let validated = 0;
      let needsReview = 0;
      let pending = 0;
      let totalQualityScore = 0;
      let qualityScoreCount = 0;

      otherTranslations.forEach(t => {
        const status = t.quality_status || 'pending';
        if (status === 'validated') validated++;
        else if (status === 'needs_review') needsReview++;
        else pending++;

        if (t.quality_score !== null) {
          totalQualityScore += t.quality_score;
          qualityScoreCount++;
        }
      });

      // Calculate coverage by namespace and language
      const byNamespace: Record<string, { translated: number; total: number; percentage: number }> = {};
      const byLanguage: Record<string, { translated: number; total: number; percentage: number; qualityScore?: number }> = {};
      const missingKeys: Array<{ namespace: string; key: string; missingIn: string[] }> = [];

      // Initialize English as 100% complete
      byLanguage['en'] = { 
        translated: totalEnglishKeys, 
        total: totalEnglishKeys, 
        percentage: 100 
      };

      // Initialize namespace totals (total = English keys only, not multiplied)
      englishTranslations.forEach(t => {
        const keyCount = flattenKeys(t.translations as Record<string, any>).length;
        if (!byNamespace[t.namespace]) {
          byNamespace[t.namespace] = { translated: 0, total: keyCount, percentage: 0 };
        }
      });

      // Track missing keys per namespace/key
      const missingKeyMap: Record<string, Set<string>> = {};

      // Calculate coverage for other languages
      OTHER_LANGUAGES.forEach(lang => {
        let langTranslated = 0;
        let langTotal = 0;
        let langQualitySum = 0;
        let langQualityCount = 0;
        
        Object.entries(expectedKeysByNamespace).forEach(([ns, expectedKeys]) => {
          const langTranslation = otherTranslations.find(t => t.namespace === ns && t.language === lang);
          const langKeys = langTranslation 
            ? new Set(flattenKeys(langTranslation.translations as Record<string, any>)) 
            : new Set<string>();
          
          // Track quality score for this language
          if (langTranslation?.quality_score !== null && langTranslation?.quality_score !== undefined) {
            langQualitySum += langTranslation.quality_score;
            langQualityCount++;
          }
          
          // Count how many expected keys this language has
          let matchedKeys = 0;
          expectedKeys.forEach(key => {
            if (langKeys.has(key)) {
              matchedKeys++;
            } else {
              // Track missing key
              const fullKey = `${ns}:${key}`;
              if (!missingKeyMap[fullKey]) {
                missingKeyMap[fullKey] = new Set();
              }
              missingKeyMap[fullKey].add(lang);
            }
          });
          
          langTranslated += matchedKeys;
          langTotal += expectedKeys.size;
        });

        byLanguage[lang] = {
          translated: langTranslated,
          total: langTotal,
          percentage: langTotal > 0 ? Math.min((langTranslated / langTotal) * 100, 100) : 0,
          qualityScore: langQualityCount > 0 ? Math.round(langQualitySum / langQualityCount) : undefined,
        };
      });

      // Calculate namespace coverage (average across all languages)
      Object.entries(expectedKeysByNamespace).forEach(([ns, expectedKeys]) => {
        let totalTranslatedAcrossLangs = expectedKeys.size; // English is complete
        
        OTHER_LANGUAGES.forEach(lang => {
          const langTranslation = otherTranslations.find(t => t.namespace === ns && t.language === lang);
          if (langTranslation) {
            const langKeys = new Set(flattenKeys(langTranslation.translations as Record<string, any>));
            // Count matches only
            let matches = 0;
            expectedKeys.forEach(key => {
              if (langKeys.has(key)) matches++;
            });
            totalTranslatedAcrossLangs += matches;
          }
        });
        
        // Total possible = keys × all languages (8)
        const totalPossible = expectedKeys.size * ALL_LANGUAGES.length;
        byNamespace[ns] = {
          translated: totalTranslatedAcrossLangs,
          total: totalPossible,
          percentage: totalPossible > 0 ? Math.min((totalTranslatedAcrossLangs / totalPossible) * 100, 100) : 0
        };
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

      // Calculate overall completion (average across all languages)
      let totalTranslated = 0;
      let totalExpected = 0;
      
      ALL_LANGUAGES.forEach(lang => {
        if (byLanguage[lang]) {
          totalTranslated += byLanguage[lang].translated;
          totalExpected += byLanguage[lang].total;
        }
      });
      
      const overallCompletion = totalExpected > 0 
        ? Math.min((totalTranslated / totalExpected) * 100, 100) 
        : 0;

      return {
        byNamespace,
        byLanguage,
        missingKeys: missingKeys.slice(0, 100), // Limit to 100 for performance
        overallCompletion,
        qualitySummary: {
          validated,
          needsReview,
          pending,
          averageQuality: qualityScoreCount > 0 ? Math.round(totalQualityScore / qualityScoreCount) : 0,
        },
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
