import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TranslationNamespace {
  id: string;
  namespace: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  key_count: number;
  last_synced_at: string | null;
}

// Default namespaces fallback
const DEFAULT_NAMESPACES: TranslationNamespace[] = [
  { id: '1', namespace: 'common', description: 'Common UI', priority: 1, is_active: true, key_count: 0, last_synced_at: null },
  { id: '2', namespace: 'auth', description: 'Authentication', priority: 2, is_active: true, key_count: 0, last_synced_at: null },
  { id: '3', namespace: 'onboarding', description: 'Onboarding', priority: 3, is_active: true, key_count: 0, last_synced_at: null },
  { id: '4', namespace: 'admin', description: 'Admin dashboard', priority: 4, is_active: true, key_count: 0, last_synced_at: null },
  { id: '5', namespace: 'analytics', description: 'Analytics', priority: 5, is_active: true, key_count: 0, last_synced_at: null },
  { id: '6', namespace: 'candidates', description: 'Candidates', priority: 5, is_active: true, key_count: 0, last_synced_at: null },
  { id: '7', namespace: 'compliance', description: 'Compliance', priority: 5, is_active: true, key_count: 0, last_synced_at: null },
  { id: '8', namespace: 'contracts', description: 'Contracts', priority: 5, is_active: true, key_count: 0, last_synced_at: null },
  { id: '9', namespace: 'jobs', description: 'Jobs', priority: 4, is_active: true, key_count: 0, last_synced_at: null },
  { id: '10', namespace: 'meetings', description: 'Meetings', priority: 4, is_active: true, key_count: 0, last_synced_at: null },
  { id: '11', namespace: 'messages', description: 'Messages', priority: 4, is_active: true, key_count: 0, last_synced_at: null },
  { id: '12', namespace: 'partner', description: 'Partner portal', priority: 4, is_active: true, key_count: 0, last_synced_at: null },
  { id: '13', namespace: 'settings', description: 'Settings', priority: 5, is_active: true, key_count: 0, last_synced_at: null },
];

export const useTranslationNamespaces = () => {
  return useQuery({
    queryKey: ['translation-namespaces'],
    queryFn: async (): Promise<TranslationNamespace[]> => {
      // Get unique namespaces from translations table
      const { data: translations, error } = await supabase
        .from('translations')
        .select('namespace')
        .eq('is_active', true);

      if (error || !translations) {
        console.error('Failed to fetch namespaces:', error);
        return DEFAULT_NAMESPACES;
      }

      const uniqueNamespaces = [...new Set(translations.map(t => t.namespace))];
      
      // Merge with defaults to ensure all 13 are present
      const nsSet = new Set(uniqueNamespaces);
      const allNamespaces = DEFAULT_NAMESPACES.map(def => ({
        ...def,
        is_active: nsSet.has(def.namespace)
      }));

      return allNamespaces;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useActiveLanguages = () => {
  return useQuery({
    queryKey: ['active-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_config')
        .select('code, name, native_name, flag, is_active, is_default')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Failed to fetch languages:', error);
        return [
          { code: 'en', name: 'English', native_name: 'English', flag: '🇬🇧', is_active: true, is_default: true },
          { code: 'nl', name: 'Dutch', native_name: 'Nederlands', flag: '🇳🇱', is_active: true, is_default: false },
          { code: 'de', name: 'German', native_name: 'Deutsch', flag: '🇩🇪', is_active: true, is_default: false },
          { code: 'fr', name: 'French', native_name: 'Français', flag: '🇫🇷', is_active: true, is_default: false },
        ];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export default useTranslationNamespaces;
