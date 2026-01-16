import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandTerm {
  id: string;
  term: string;
  description: string | null;
  never_translate: boolean;
  translations: Record<string, string>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useBrandTerms() {
  return useQuery({
    queryKey: ['brand-terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_terms')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as BrandTerm[];
    },
  });
}

export function useCreateBrandTerm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (term: Partial<BrandTerm>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('brand_terms')
        .insert([{
          term: term.term ?? '',
          description: term.description,
          never_translate: term.never_translate ?? true,
          translations: term.translations ?? {},
          priority: term.priority ?? 0,
          created_by: user?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-terms'] });
    },
  });
}

export function useUpdateBrandTerm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BrandTerm> & { id: string }) => {
      const { data, error } = await supabase
        .from('brand_terms')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-terms'] });
    },
  });
}

export function useDeleteBrandTerm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brand_terms')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-terms'] });
    },
  });
}
