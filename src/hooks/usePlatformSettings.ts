import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

interface PlatformSettings {
  estimated_placement_fee: number;
  pipeline_conversion_rate: number;
  currency: string;
}

export function usePlatformSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async (): Promise<PlatformSettings> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach((setting: { key: string; value: any }) => {
        settingsMap[setting.key] = setting.value;
      });

      return {
        estimated_placement_fee: Number(settingsMap.estimated_placement_fee) || 15000,
        pipeline_conversion_rate: Number(settingsMap.pipeline_conversion_rate) || 0.3,
        currency: String(settingsMap.currency || 'EUR').replace(/"/g, ''),
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    },
  });

  return {
    settings: settings || {
      estimated_placement_fee: 15000,
      pipeline_conversion_rate: 0.3,
      currency: 'EUR',
    },
    isLoading,
    error,
    updateSetting,
  };
}
