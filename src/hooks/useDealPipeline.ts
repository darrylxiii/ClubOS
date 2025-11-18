import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DealStage {
  id: string;
  name: string;
  stage_order: number;
  probability_weight: number;
  is_terminal: boolean;
  stage_type: 'active' | 'won' | 'lost';
  description: string | null;
  color: string;
}

export interface Deal {
  id: string;
  title: string;
  company_name: string;
  company_id: string;
  status: string;
  deal_stage: string;
  deal_probability: number;
  expected_close_date: string | null;
  deal_value_override: number | null;
  deal_health_score: number;
  last_activity_date: string;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
  active_candidates?: number;
  estimated_value?: number;
}

export interface PipelineMetrics {
  total_pipeline: number;
  weighted_pipeline: number;
  deal_count: number;
  avg_deal_size: number;
}

export function useDealStages() {
  return useQuery({
    queryKey: ['deal-stages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('deal_stages')
        .select('*')
        .order('stage_order');
      
      if (error) throw error;
      return data as DealStage[];
    },
  });
}

export function useDealPipeline() {
  return useQuery({
    queryKey: ['deal-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies(name),
          applications(count)
        `)
        .eq('status', 'open')
        .eq('is_lost', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to include candidate count and estimated value
      const deals = data.map((job: any) => ({
        ...job,
        company_name: job.companies?.name || job.company_name || 'Unknown',
        active_candidates: job.applications?.[0]?.count || 0,
        estimated_value: job.deal_value_override || 0,
      })) as Deal[];
      
      return deals;
    },
  });
}

export function usePipelineMetrics() {
  return useQuery({
    queryKey: ['pipeline-metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc('calculate_weighted_pipeline');
      
      if (error) throw error;
      return data[0] as PipelineMetrics;
    },
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ dealId, newStage }: { dealId: string; newStage: string }) => {
      const { data, error } = await supabase
        .from('jobs')
        .update({ 
          deal_stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
    },
  });
}

export function useUpdateDealHealth(dealId: string) {
  return useQuery({
    queryKey: ['deal-health', dealId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc('calculate_deal_health_score', { job_id: dealId });
      
      if (error) throw error;
      
      // Update the job with the new health score
      await supabase
        .from('jobs')
        .update({ deal_health_score: data })
        .eq('id', dealId);
      
      return data as number;
    },
    enabled: !!dealId,
  });
}

export function useLostDeals() {
  return useQuery({
    queryKey: ['lost-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          deal_loss_reasons(*)
        `)
        .eq('is_lost', true)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkDealLost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      dealId, 
      reasonCategory, 
      detailedReason,
      competitorName,
      couldRevisit,
    }: { 
      dealId: string;
      reasonCategory: string;
      detailedReason: string;
      competitorName?: string;
      couldRevisit: boolean;
    }) => {
      // Update job
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ 
          is_lost: true,
          deal_stage: 'Closed Lost',
          deal_probability: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);
      
      if (jobError) throw jobError;
      
      // Create loss reason
      const { error: reasonError } = await (supabase as any)
        .from('deal_loss_reasons')
        .insert({
          deal_id: dealId,
          reason_category: reasonCategory,
          detailed_reason: detailedReason,
          competitor_name: competitorName,
          could_revisit: couldRevisit,
        });
      
      if (reasonError) throw reasonError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['lost-deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
    },
  });
}
