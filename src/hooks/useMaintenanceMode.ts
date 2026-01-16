import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaintenanceModeConfig {
  enabled: boolean;
  message: string;
  eta: string | null;
  allowed_roles: string[];
  toggled_by?: string;
  toggled_at?: string;
}

export function useMaintenanceMode() {
  const [config, setConfig] = useState<MaintenanceModeConfig>({
    enabled: false,
    message: '',
    eta: null,
    allowed_roles: ['admin', 'super_admin'],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_maintenance_mode');

      if (error) throw error;
      if (data) {
        setConfig(data as unknown as MaintenanceModeConfig);
      }
    } catch (error: any) {
      console.error('Error fetching maintenance mode:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const toggleMaintenanceMode = async (
    enabled: boolean,
    message?: string,
    eta?: Date
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('toggle_maintenance_mode', {
        p_enabled: enabled,
        p_message: message || undefined,
        p_eta: eta?.toISOString() || undefined,
      });

      if (error) throw error;

      toast.success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      await fetchConfig();
      return true;
    } catch (error: any) {
      console.error('Error toggling maintenance mode:', error);
      toast.error(error.message || 'Failed to toggle maintenance mode');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    config,
    isLoading,
    isMaintenanceMode: config.enabled,
    toggleMaintenanceMode,
    refetch: fetchConfig,
  };
}
