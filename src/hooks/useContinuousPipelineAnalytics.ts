import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContinuousPipelineHire } from "@/types/analytics";

export function useContinuousPipelineJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ['continuous-pipeline-jobs', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          company_id,
          is_continuous,
          hired_count,
          target_hire_count,
          created_at,
          status
        `)
        .eq('company_id', companyId)
        .eq('is_continuous', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContinuousPipelineHires(jobId: string | undefined) {
  return useQuery<ContinuousPipelineHire[]>({
    queryKey: ['continuous-pipeline-hires', jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await (supabase as any)
        .from('continuous_pipeline_hires')
        .select('*')
        .eq('job_id', jobId)
        .order('hire_number', { ascending: true });

      if (error) throw error;
      return (data || []) as ContinuousPipelineHire[];
    },
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useContinuousPipelineMetrics(companyId: string | undefined) {
  return useQuery({
    queryKey: ['continuous-pipeline-metrics', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Get all continuous jobs for this company
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, hired_count, target_hire_count, created_at')
        .eq('company_id', companyId)
        .eq('is_continuous', true);

      if (jobsError) throw jobsError;

      // Get all hires for these jobs
      const jobIds = (jobs || []).map(j => j.id);
      if (jobIds.length === 0) {
        return {
          totalContinuousJobs: 0,
          totalHires: 0,
          avgHiresPerPipeline: 0,
          totalRevenue: 0,
          avgDaysBetweenHires: null,
          activeJobs: 0,
          completedJobs: 0,
        };
      }

      const { data: hires, error: hiresError } = await (supabase as any)
        .from('continuous_pipeline_hires')
        .select('*')
        .in('job_id', jobIds);

      if (hiresError) throw hiresError;

      const totalHires = (hires || []).length;
      const totalRevenue = (hires || []).reduce((sum: number, h: any) => sum + (h.placement_fee || 0), 0);
      
      // Calculate average days between hires
      let avgDaysBetweenHires = null;
      if (totalHires >= 2) {
        const sortedHires = [...(hires || [])].sort((a: any, b: any) => 
          new Date(a.hired_at).getTime() - new Date(b.hired_at).getTime()
        );
        let totalDays = 0;
        let gapCount = 0;
        for (let i = 1; i < sortedHires.length; i++) {
          const days = Math.floor(
            (new Date(sortedHires[i].hired_at).getTime() - new Date(sortedHires[i-1].hired_at).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          totalDays += days;
          gapCount++;
        }
        if (gapCount > 0) {
          avgDaysBetweenHires = Math.round(totalDays / gapCount);
        }
      }

      // Count active vs completed
      const activeJobs = (jobs || []).filter((j: any) => 
        j.target_hire_count === null || j.hired_count < j.target_hire_count
      ).length;
      const completedJobs = (jobs || []).length - activeJobs;

      return {
        totalContinuousJobs: (jobs || []).length,
        totalHires,
        avgHiresPerPipeline: (jobs || []).length > 0 ? Math.round(totalHires / (jobs || []).length * 10) / 10 : 0,
        totalRevenue,
        avgDaysBetweenHires,
        activeJobs,
        completedJobs,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}
