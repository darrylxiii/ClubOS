import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OKRObjective {
  id: string;
  title: string;
  description: string | null;
  quarter: string;
  year: number;
  owner_id: string | null;
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
  progress: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  key_results?: OKRKeyResult[];
}

export interface OKRKeyResult {
  id: string;
  objective_id: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
  contribution_weight: number;
  created_at: string;
  updated_at: string;
  linked_kpis?: string[];
}

export interface KPIOKRLink {
  id: string;
  kpi_name: string;
  key_result_id: string;
  contribution_weight: number;
  created_at: string;
}

export function useOKRObjectives(quarter?: string, year?: number) {
  return useQuery({
    queryKey: ['okr-objectives', quarter, year],
    queryFn: async () => {
      let query = supabase
        .from('okr_objectives')
        .select(`
          *,
          key_results:okr_key_results(*)
        `)
        .order('created_at', { ascending: false });

      if (quarter) {
        query = query.eq('quarter', quarter);
      }
      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as OKRObjective[];
    }
  });
}

export function useOKRKeyResults(objectiveId?: string) {
  return useQuery({
    queryKey: ['okr-key-results', objectiveId],
    queryFn: async () => {
      let query = supabase
        .from('okr_key_results')
        .select('*')
        .order('created_at', { ascending: true });

      if (objectiveId) {
        query = query.eq('objective_id', objectiveId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as OKRKeyResult[];
    },
    enabled: !!objectiveId || objectiveId === undefined
  });
}

export function useKPIOKRLinks() {
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['kpi-okr-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_okr_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as KPIOKRLink[];
    }
  });

  const linkKPIMutation = useMutation({
    mutationFn: async ({ kpiName, keyResultId, weight }: { kpiName: string; keyResultId: string; weight: number }) => {
      const { error } = await supabase
        .from('kpi_okr_links')
        .insert({
          kpi_name: kpiName,
          key_result_id: keyResultId,
          contribution_weight: weight
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-okr-links'] });
    }
  });

  const unlinkKPIMutation = useMutation({
    mutationFn: async ({ kpiName, keyResultId }: { kpiName: string; keyResultId: string }) => {
      const { error } = await supabase
        .from('kpi_okr_links')
        .delete()
        .eq('kpi_name', kpiName)
        .eq('key_result_id', keyResultId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-okr-links'] });
    }
  });

  const getLinksForKeyResult = (keyResultId: string) => {
    return links.filter(l => l.key_result_id === keyResultId);
  };

  return {
    links,
    isLoading,
    linkKPI: linkKPIMutation.mutate,
    unlinkKPI: unlinkKPIMutation.mutate,
    isLinking: linkKPIMutation.isPending,
    isUnlinking: unlinkKPIMutation.isPending,
    getLinksForKeyResult
  };
}

export function useCreateOKRObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objective: Omit<OKRObjective, 'id' | 'created_at' | 'updated_at' | 'key_results'>) => {
      const { data, error } = await supabase
        .from('okr_objectives')
        .insert(objective)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
    }
  });
}

export function useCreateOKRKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyResult: Omit<OKRKeyResult, 'id' | 'created_at' | 'updated_at' | 'linked_kpis'>) => {
      const { data, error } = await supabase
        .from('okr_key_results')
        .insert(keyResult)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
    }
  });
}

export function useUpdateOKRProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ keyResultId, currentValue }: { keyResultId: string; currentValue: number }) => {
      const { error } = await supabase
        .from('okr_key_results')
        .update({ current_value: currentValue, updated_at: new Date().toISOString() })
        .eq('id', keyResultId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
    }
  });
}
