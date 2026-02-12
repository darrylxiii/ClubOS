import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ModuleFlag {
  id: string;
  flag_key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  metadata: {
    category: string;
    affected_routes: string[];
    polling_queries_per_hour: number;
    description_long: string;
  };
  updated_at: string;
}

const MODULE_PREFIX = 'module_';

export function useModuleFlags() {
  const [modules, setModules] = useState<ModuleFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, flag_key, name, description, enabled, metadata, updated_at')
        .like('flag_key', 'module_%')
        .order('name');

      if (error) throw error;
      setModules((data || []) as ModuleFlag[]);
    } catch (error) {
      console.error('Error fetching module flags:', error);
      toast.error('Failed to load module flags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const toggleModule = useCallback(async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setModules(prev =>
        prev.map(m => (m.id === id ? { ...m, enabled, updated_at: new Date().toISOString() } : m))
      );

      const mod = modules.find(m => m.id === id);
      toast.success(`${mod?.name ?? 'Module'} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling module:', error);
      toast.error('Failed to toggle module');
    }
  }, [modules]);

  const bulkToggle = useCallback(async (ids: string[], enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      setModules(prev =>
        prev.map(m => (ids.includes(m.id) ? { ...m, enabled, updated_at: new Date().toISOString() } : m))
      );

      toast.success(`${ids.length} modules ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error bulk toggling:', error);
      toast.error('Failed to update modules');
    }
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(modules.map(m => m.metadata?.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [modules]);

  const activeCount = useMemo(() => modules.filter(m => m.enabled).length, [modules]);
  const disabledCount = useMemo(() => modules.filter(m => !m.enabled).length, [modules]);
  const pollingSavings = useMemo(
    () => modules.filter(m => !m.enabled).reduce((sum, m) => sum + (m.metadata?.polling_queries_per_hour ?? 0), 0),
    [modules]
  );

  const isModuleEnabled = useCallback(
    (flagKey: string) => {
      const mod = modules.find(m => m.flag_key === flagKey);
      return mod ? mod.enabled : true; // default to enabled if not found
    },
    [modules]
  );

  return {
    modules,
    isLoading,
    categories,
    activeCount,
    disabledCount,
    pollingSavings,
    fetchModules,
    toggleModule,
    bulkToggle,
    isModuleEnabled,
  };
}
