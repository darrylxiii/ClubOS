import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TranslationCoverage {
  namespace: string;
  language: string;
  keyCount: number;
  totalKeys: number;
  percentage: number;
}

interface CoverageSummary {
  byNamespace: Record<string, TranslationCoverage[]>;
  byLanguage: Record<string, { completed: number; total: number; percentage: number }>;
  missingKeys: Array<{ namespace: string; language: string; missingCount: number }>;
  overallCompletion: number;
}

/**
 * Hook to analyze translation coverage across languages and namespaces
 * Useful for tracking translation progress and identifying gaps
 */
export const useTranslationCoverage = () => {
  return useQuery({
    queryKey: ['translation-coverage-analysis'],
    queryFn: async (): Promise<CoverageSummary> => {
      // Fetch all translations
      const { data: translations, error } = await supabase
        .from('translations')
        .select('namespace, language, translations')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Get English (source) translations to determine expected keys
      const englishTranslations = translations?.filter(t => t.language === 'en') || [];
      const expectedKeys: Record<string, number> = {};
      
      englishTranslations.forEach(t => {
        const keyCount = Object.keys(t.translations as object || {}).length;
        expectedKeys[t.namespace] = keyCount;
      });
      
      // Analyze coverage by namespace and language
      const byNamespace: Record<string, TranslationCoverage[]> = {};
      const byLanguage: Record<string, { completed: number; total: number; percentage: number }> = {};
      const missingKeys: Array<{ namespace: string; language: string; missingCount: number }> = [];
      
      translations?.forEach(t => {
        const namespace = t.namespace;
        const language = t.language;
        const keyCount = Object.keys(t.translations as object || {}).length;
        const totalKeys = expectedKeys[namespace] || keyCount;
        const percentage = totalKeys > 0 ? Math.round((keyCount / totalKeys) * 100) : 0;
        
        // By namespace
        if (!byNamespace[namespace]) byNamespace[namespace] = [];
        byNamespace[namespace].push({ namespace, language, keyCount, totalKeys, percentage });
        
        // By language
        if (!byLanguage[language]) {
          byLanguage[language] = { completed: 0, total: 0, percentage: 0 };
        }
        byLanguage[language].completed += keyCount;
        byLanguage[language].total += totalKeys;
        
        // Missing keys
        if (keyCount < totalKeys) {
          missingKeys.push({
            namespace,
            language,
            missingCount: totalKeys - keyCount
          });
        }
      });
      
      // Calculate percentages for languages
      Object.keys(byLanguage).forEach(lang => {
        const data = byLanguage[lang];
        data.percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      });
      
      // Calculate overall completion
      const totalPossibleKeys = Object.values(byLanguage).reduce((sum, lang) => sum + lang.total, 0);
      const totalCompletedKeys = Object.values(byLanguage).reduce((sum, lang) => sum + lang.completed, 0);
      const overallCompletion = totalPossibleKeys > 0 ? Math.round((totalCompletedKeys / totalPossibleKeys) * 100) : 0;
      
      return {
        byNamespace,
        byLanguage,
        missingKeys,
        overallCompletion
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
