import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TranslationRecord {
  id: string;
  namespace: string;
  language: string;
  translations: Record<string, any>;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface FlatTranslation {
  namespace: string;
  key: string;
  values: Record<string, string>; // language -> value
}

// Get all translations for a namespace across all languages
export function useNamespaceTranslations(namespace: string) {
  return useQuery({
    queryKey: ['namespace-translations', namespace],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('namespace', namespace)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as TranslationRecord[];
    },
    enabled: !!namespace,
  });
}

// Flatten nested translations for editing
export function flattenTranslations(
  records: TranslationRecord[]
): FlatTranslation[] {
  const keyMap = new Map<string, Record<string, string>>();
  
  records.forEach(record => {
    const flatKeys = flattenObject(record.translations);
    Object.entries(flatKeys).forEach(([key, value]) => {
      if (!keyMap.has(key)) {
        keyMap.set(key, {});
      }
      keyMap.get(key)![record.language] = value;
    });
  });
  
  return Array.from(keyMap.entries()).map(([key, values]) => ({
    namespace: records[0]?.namespace || '',
    key,
    values,
  }));
}

// Flatten nested object to dot notation
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }
  
  return result;
}

// Unflatten dot notation back to nested object
export function unflattenObject(obj: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  return result;
}

// Update a single translation value
export function useUpdateTranslation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      namespace,
      language,
      key,
      value,
    }: {
      namespace: string;
      language: string;
      key: string;
      value: string;
    }) => {
      // Get current translation record
      const { data: current, error: fetchError } = await supabase
        .from('translations')
        .select('*')
        .eq('namespace', namespace)
        .eq('language', language)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Get the old value for audit
      const flatCurrent = flattenObject(current.translations as Record<string, any>);
      const oldValue = flatCurrent[key];
      
      // Update the specific key
      flatCurrent[key] = value;
      const newTranslations = unflattenObject(flatCurrent);
      
      // Update in database
      const { data, error } = await supabase
        .from('translations')
        .update({
          translations: newTranslations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log the change
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('translation_audit_log').insert({
        translation_id: current.id,
        namespace,
        language,
        key_path: key,
        old_value: oldValue,
        new_value: value,
        action: 'update',
        changed_by: user?.id,
        metadata: { version: current.version },
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['namespace-translations', variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['translation-audit-log'] });
    },
  });
}

// Mark translation as reviewed
export function useMarkAsReviewed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('translations')
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['namespace-translations'] });
    },
  });
}
