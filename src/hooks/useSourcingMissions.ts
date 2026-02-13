import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SourcingMission {
  id: string;
  job_id: string;
  status: string;
  search_criteria: Record<string, unknown> | null;
  search_strategy: Record<string, unknown> | null;
  search_radius: string | null;
  profiles_found: number | null;
  profiles_new: number | null;
  profiles_ranked: number | null;
  cost_credits_used: number | null;
  results: Record<string, unknown> | null;
  error: string | null;
  triggered_by: string | null;
  created_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  time_spent_minutes: number | null;
}

export function useSourcingMissions(jobId?: string) {
  const queryClient = useQueryClient();

  const missionsQuery = useQuery({
    queryKey: ['sourcing-missions', jobId],
    queryFn: async () => {
      let query = supabase
        .from('sourcing_missions')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as SourcingMission[];
    },
  });

  const createMission = useMutation({
    mutationFn: async (params: { jobId: string; triggeredBy?: string; searchCriteria?: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sourcing_missions')
        .insert({
          job_id: params.jobId,
          status: 'pending',
          triggered_by: params.triggeredBy || 'manual',
          search_criteria: params.searchCriteria || {},
          created_by: user.id,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;
      return data as SourcingMission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-missions'] });
    },
    onError: (err) => {
      toast.error(`Failed to create mission: ${err.message}`);
    },
  });

  const generateStrategy = useMutation({
    mutationFn: async (targetJobId: string) => {
      const { data, error } = await supabase.functions.invoke('guide-sourcing-strategy', {
        body: { jobId: targetJobId },
      });
      if (error) throw error;
      return data;
    },
    onError: (err) => {
      toast.error(`Strategy generation failed: ${err.message}`);
    },
  });

  const sourceCandidates = useMutation({
    mutationFn: async (params: { jobId: string; linkedinUrls: string[]; missionId?: string }) => {
      const { data, error } = await supabase.functions.invoke('source-candidates', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-missions'] });
    },
    onError: (err) => {
      toast.error(`Sourcing failed: ${err.message}`);
    },
  });

  return {
    missions: missionsQuery.data || [],
    isLoading: missionsQuery.isLoading,
    error: missionsQuery.error,
    createMission,
    generateStrategy,
    sourceCandidates,
    refetch: missionsQuery.refetch,
  };
}
