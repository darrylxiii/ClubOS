import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureFlag {
  id: string;
  flag_key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  target_roles: string[];
  target_company_ids: string[];
  target_user_ids: string[];
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlags((data || []) as FeatureFlag[]);
    } catch (error: any) {
      console.error('Error fetching feature flags:', error);
      toast.error('Failed to load feature flags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const createFlag = async (flag: Partial<FeatureFlag>): Promise<boolean> => {
    if (!flag.flag_key) {
      toast.error('Flag key is required');
      return false;
    }
    try {
      const { error } = await supabase.from('feature_flags').insert([{
        flag_key: flag.flag_key,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled ?? false,
        rollout_percentage: flag.rollout_percentage ?? 100,
        target_roles: flag.target_roles ?? [],
        target_company_ids: flag.target_company_ids ?? [],
        target_user_ids: flag.target_user_ids ?? [],
        metadata: flag.metadata ?? {},
      }]);

      if (error) throw error;
      toast.success('Feature flag created');
      await fetchFlags();
      return true;
    } catch (error: any) {
      console.error('Error creating feature flag:', error);
      toast.error(error.message || 'Failed to create feature flag');
      return false;
    }
  };

  const updateFlag = async (id: string, updates: Partial<FeatureFlag>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Feature flag updated');
      await fetchFlags();
      return true;
    } catch (error: any) {
      console.error('Error updating feature flag:', error);
      toast.error(error.message || 'Failed to update feature flag');
      return false;
    }
  };

  const deleteFlag = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('feature_flags').delete().eq('id', id);

      if (error) throw error;
      toast.success('Feature flag deleted');
      await fetchFlags();
      return true;
    } catch (error: any) {
      console.error('Error deleting feature flag:', error);
      toast.error(error.message || 'Failed to delete feature flag');
      return false;
    }
  };

  const toggleFlag = async (id: string, enabled: boolean): Promise<boolean> => {
    return updateFlag(id, { enabled });
  };

  return {
    flags,
    isLoading,
    fetchFlags,
    createFlag,
    updateFlag,
    deleteFlag,
    toggleFlag,
  };
}

// Hook to check if a specific feature is enabled for current user
export function useFeatureFlag(flagKey: string) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFlag = async () => {
      try {
        const { data, error } = await supabase.rpc('is_feature_enabled', {
          p_flag_key: flagKey,
        });

        if (error) throw error;
        setIsEnabled(data || false);
      } catch (error) {
        console.error('Error checking feature flag:', error);
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFlag();
  }, [flagKey]);

  return { isEnabled, isLoading };
}
