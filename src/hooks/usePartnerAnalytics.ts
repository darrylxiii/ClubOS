import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePartnerAnalytics(companyId: string | undefined) {
  return useQuery({
    queryKey: ['partner-analytics', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      // Generate snapshot if needed
      await supabase.rpc('generate_daily_analytics_snapshot' as any, {
        p_company_id: companyId
      });

      const { data, error } = await supabase
        .from('partner_analytics_snapshots' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('snapshot_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    refetchInterval: 300000 // Refresh every 5 minutes
  });
}

export function useGenerateInsights(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightType?: string) => {
      if (!companyId) throw new Error('Company ID required');

      const { data, error } = await supabase.functions.invoke('generate-partner-insights', {
        body: { companyId, insightType }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Insights generated successfully');
      queryClient.invalidateQueries({ queryKey: ['partner-analytics', companyId] });
      queryClient.invalidateQueries({ queryKey: ['smart-alerts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['daily-briefing', companyId] });
    },
    onError: (error: any) => {
      toast.error('Failed to generate insights', {
        description: error.message
      });
    }
  });
}

export function useTalentMatches(companyId: string | undefined, jobId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['talent-matches', companyId, jobId],
    queryFn: async () => {
      if (!companyId) return [];

      let queryBuilder = supabase
        .from('talent_matches' as any)
        .select(`
          *,
          candidate:candidate_profiles!talent_matches_candidate_id_fkey(
            id,
            full_name,
            title,
            avatar_url,
            skills,
            years_of_experience
          ),
          job:jobs!talent_matches_job_id_fkey(
            title
          )
        `)
        .eq('company_id', companyId);

      if (jobId) {
        queryBuilder = queryBuilder.eq('job_id', jobId);
      }

      const { data, error } = await queryBuilder
        .in('status', ['pending', 'viewed', 'contacted'])
        .order('match_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const generateMatches = useMutation({
    mutationFn: async (targetJobId: string) => {
      const { error } = await supabase.rpc('generate_talent_matches' as any, {
        p_job_id: targetJobId,
        p_limit: 10
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('New talent matches generated');
      queryClient.invalidateQueries({ queryKey: ['talent-matches', companyId] });
    },
    onError: (error: any) => {
      toast.error('Failed to generate matches', {
        description: error.message
      });
    }
  });

  return { ...query, generateMatches };
}

export function useStrategistAssignment(companyId: string | undefined) {
  return useQuery({
    queryKey: ['strategist-assignment', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('company_strategist_assignments' as any)
        .select(`
          *,
          strategist:profiles!company_strategist_assignments_strategist_id_fkey(
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!companyId
  });
}

export function useSLATracking(companyId: string | undefined) {
  return useQuery({
    queryKey: ['sla-tracking', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('sla_tracking' as any)
        .select('*')
        .eq('company_id', companyId)
        .is('completed_at', null)
        .order('sla_deadline', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 60000 // Check every minute
  });
}
