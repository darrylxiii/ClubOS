import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EdgeFunctionEntry {
  id: string;
  function_name: string;
  display_name: string | null;
  description: string | null;
  category: string | null;
  is_active: boolean | null;
  verify_jwt: boolean | null;
  last_invoked_at: string | null;
  invocation_count: number | null;
  avg_execution_time_ms: number | null;
  error_rate: number | null;
  polling_interval_ms: number | null;
  admin_disabled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useEdgeFunctionRegistry(category?: string) {
  return useQuery({
    queryKey: ['edge-function-registry', category],
    queryFn: async () => {
      let query = supabase
        .from('edge_function_registry')
        .select('*')
        .order('function_name');

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EdgeFunctionEntry[];
    },
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}

export function useEdgeFunctionCategories() {
  return useQuery({
    queryKey: ['edge-function-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edge_function_registry')
        .select('category');

      if (error) throw error;
      const categories = [...new Set((data || []).map(d => d.category).filter(Boolean))] as string[];
      return categories.sort();
    },
    staleTime: 300000,
  });
}

export function useEdgeFunctionStats() {
  return useQuery({
    queryKey: ['edge-function-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edge_function_registry')
        .select('is_active, category, invocation_count, error_rate, avg_execution_time_ms');

      if (error) throw error;
      const entries = data || [];

      const total = entries.length;
      const active = entries.filter(e => e.is_active !== false).length;
      const disabled = total - active;
      const totalInvocations = entries.reduce((s, e) => s + (e.invocation_count || 0), 0);
      const avgErrorRate = entries.length > 0
        ? entries.reduce((s, e) => s + (Number(e.error_rate) || 0), 0) / entries.length
        : 0;

      const byCategory: Record<string, { count: number; invocations: number }> = {};
      entries.forEach(e => {
        const cat = e.category || 'Uncategorized';
        if (!byCategory[cat]) byCategory[cat] = { count: 0, invocations: 0 };
        byCategory[cat].count++;
        byCategory[cat].invocations += e.invocation_count || 0;
      });

      return { total, active, disabled, totalInvocations, avgErrorRate, byCategory };
    },
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}

export function useToggleEdgeFunction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('edge_function_registry')
        .update({
          is_active: isActive,
          admin_disabled_at: isActive ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      toast.success(`Function ${isActive ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['edge-function-registry'] });
      queryClient.invalidateQueries({ queryKey: ['edge-function-stats'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update function');
    },
  });
}

export function useUpdatePollingInterval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, intervalMs }: { id: string; intervalMs: number | null }) => {
      const { error } = await supabase
        .from('edge_function_registry')
        .update({
          polling_interval_ms: intervalMs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Polling interval updated');
      queryClient.invalidateQueries({ queryKey: ['edge-function-registry'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update interval');
    },
  });
}

export function useBulkToggleFunctions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, isActive }: { category: string; isActive: boolean }) => {
      let query = supabase
        .from('edge_function_registry')
        .update({
          is_active: isActive,
          admin_disabled_at: isActive ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: (_, { category, isActive }) => {
      toast.success(`${category === 'all' ? 'All' : category} functions ${isActive ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['edge-function-registry'] });
      queryClient.invalidateQueries({ queryKey: ['edge-function-stats'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Bulk update failed');
    },
  });
}
