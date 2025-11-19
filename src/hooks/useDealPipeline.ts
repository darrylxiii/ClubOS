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
  companies?: {
    name: string;
    placement_fee_percentage: number | null;
  };
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
          companies(name, placement_fee_percentage),
          applications(count)
        `)
        .in('status', ['published', 'open'])
        .eq('is_lost', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data and calculate revenue for each deal
      const dealsWithRevenue = await Promise.all(
        data.map(async (job: any) => {
          const feePercentage = job.companies?.placement_fee_percentage || 0;
          
          // Get candidate salary stats
          let avgSalary = 0;
          try {
            const { data: salaryData } = await (supabase as any)
              .rpc('get_pipeline_candidate_stats', { p_job_id: job.id });
            avgSalary = salaryData?.[0]?.avg_expected_salary || 0;
          } catch (err) {
            console.warn('Failed to fetch salary stats for job', job.id);
          }
          
          // Calculate estimated revenue
          const baseSalary = avgSalary || 60000; // Default fallback
          const estimatedRevenue = baseSalary * (feePercentage / 100);
          
          return {
            ...job,
            company_name: job.companies?.name || job.company_name || 'Unknown',
            active_candidates: job.applications?.[0]?.count || 0,
            estimated_value: job.deal_value_override || estimatedRevenue,
          };
        })
      ) as Deal[];
      
      return dealsWithRevenue;
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

export function useCloseJobWon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      jobId, 
      hiredCandidateId, 
      actualSalary,
      placementFee 
    }: { 
      jobId: string; 
      hiredCandidateId: string;
      actualSalary: number;
      placementFee: number;
    }) => {
      // 1. Update job to closed won
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          deal_stage: 'Closed Won',
          deal_probability: 100,
          is_lost: false,
          deal_value_override: placementFee,
          last_activity_date: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (jobError) throw jobError;
      
      // 2. Update hired candidate application
      const { error: appError } = await supabase
        .from('applications')
        .update({
          status: 'hired',
          updated_at: new Date().toISOString()
        })
        .eq('id', hiredCandidateId);
      
      if (appError) throw appError;
      
      // 3. Close other applications
      const { error: closeError } = await supabase
        .from('applications')
        .update({ status: 'closed' })
        .eq('job_id', jobId)
        .neq('id', hiredCandidateId)
        .in('status', ['active', 'pending']);
      
      if (closeError) throw closeError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    }
  });
}

export function useCloseJobLost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      jobId, 
      lossReason, 
      lossNotes 
    }: { 
      jobId: string;
      lossReason: string;
      lossNotes?: string;
    }) => {
      // 1. Update job to closed lost
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          deal_stage: 'Closed Lost',
          deal_probability: 0,
          is_lost: true,
          last_activity_date: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (jobError) throw jobError;
      
      // 2. Insert loss reason
      const { error: lossError } = await (supabase as any)
        .from('deal_loss_reasons')
        .insert({
          job_id: jobId,
          reason_category: lossReason,
          notes: lossNotes
        });
      
      if (lossError) throw lossError;
      
      // 3. Close all applications
      const { error: closeError } = await supabase
        .from('applications')
        .update({ status: 'closed' })
        .eq('job_id', jobId)
        .in('status', ['active', 'pending']);
      
      if (closeError) throw closeError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['lost-deals'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    }
  });
}

export function useArchiveJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
    }
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
    }
  });
}
