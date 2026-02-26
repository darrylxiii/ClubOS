import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ContentFormat } from './useBlogGeneration';

export interface BlogEngineSettings {
  id: string;
  is_active: boolean;
  posts_per_day: number;
  preferred_formats: ContentFormat[];
  auto_publish: boolean;
  require_medical_review: boolean;
  min_quality_score: number;
  publishing_window_start: string;
  publishing_window_end: string;
  categories: string[];
  updated_at: string;
  updated_by: string | null;
}

export function useBlogEngineSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['blog-engine-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_engine_settings' as any)
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as unknown as BlogEngineSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<BlogEngineSettings, 'id' | 'updated_at'>>) => {
      if (!settings?.id) throw new Error('No settings found');

      const { data, error } = await supabase
        .from('blog_engine_settings' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BlogEngineSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-engine-settings'] });
      toast.success('Engine settings saved');
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
      toast.error('Failed to save settings');
    },
  });

  return {
    settings,
    isLoading,
    isEngineActive: settings?.is_active ?? false,
    updateSettings: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
  };
}
