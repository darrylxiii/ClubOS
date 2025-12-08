import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecruiterMetrics {
  total_candidates_added: number;
  total_candidates_placed: number;
  total_interviews_scheduled: number;
  total_offers_made: number;
  total_sourcing_hours: number;
  total_placement_revenue: number;
  placement_rate: number;
  avg_time_to_hire_days: number;
}

export interface PipelineStats {
  total_sourced: number;
  in_screening: number;
  in_interview: number;
  in_offer: number;
  hired: number;
  rejected: number;
  active_in_pipeline: number;
}

export const useRecruiterMetrics = (userId?: string, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();

  // Get real metrics from applications table
  const { data: aggregateStats, isLoading: statsLoading } = useQuery({
    queryKey: ['recruiter-stats-real', userId, days],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch applications sourced by this user
      const { data: applications, error } = await supabase
        .from('applications')
        .select('id, status, current_stage_index, created_at, updated_at, stages')
        .eq('sourced_by', userId);

      if (error) throw error;

      const allApps = applications || [];
      const recentApps = allApps.filter(a => new Date(a.created_at) >= startDate);

      // Calculate metrics from real data
      const total_candidates_added = recentApps.length;
      const total_candidates_placed = recentApps.filter(a => a.status === 'hired').length;
      const total_interviews_scheduled = recentApps.filter(a => a.current_stage_index >= 2).length;
      const total_offers_made = recentApps.filter(a => a.current_stage_index >= 4 || a.status === 'hired').length;
      
      // Calculate placement rate
      const placement_rate = total_candidates_added > 0 
        ? (total_candidates_placed / total_candidates_added) * 100 
        : 0;

      // Fetch time entries for sourcing hours
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('duration_seconds')
        .eq('user_id', userId)
        .gte('start_time', startDateStr);

      const total_sourcing_hours = (timeEntries || []).reduce(
        (sum, t) => sum + (t.duration_seconds || 0) / 3600, 
        0
      );

      // Fetch placement revenue from employee_commissions
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount')
        .eq('employee_id', userId)
        .gte('created_at', startDateStr);

      const total_placement_revenue = (commissions || []).reduce(
        (sum, c) => sum + (c.gross_amount || 0), 
        0
      );

      // Calculate avg time to hire
      const hiredApps = allApps.filter(a => a.status === 'hired');
      let avg_time_to_hire_days = 0;
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
          const created = new Date(app.created_at);
          const updated = new Date(app.updated_at);
          return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avg_time_to_hire_days = Math.round(totalDays / hiredApps.length);
      }

      return {
        total_candidates_added,
        total_candidates_placed,
        total_interviews_scheduled,
        total_offers_made,
        total_sourcing_hours: Math.round(total_sourcing_hours * 10) / 10,
        total_placement_revenue,
        placement_rate: Math.round(placement_rate * 10) / 10,
        avg_time_to_hire_days,
      } as RecruiterMetrics;
    },
    enabled: !!userId,
  });

  // Get pipeline stats from applications table
  const { data: pipelineStats, isLoading: pipelineLoading } = useQuery({
    queryKey: ['recruiter-pipeline-stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('applications')
        .select('status, current_stage_index')
        .eq('sourced_by', userId);
      
      if (error) throw error;
      
      const apps = data || [];
      const activeApps = apps.filter(a => a.status === 'active' || a.status === 'in_progress');
      
      const stats: PipelineStats = {
        total_sourced: apps.length,
        in_screening: apps.filter(a => a.current_stage_index === 1 && a.status !== 'rejected').length,
        in_interview: apps.filter(a => a.current_stage_index >= 2 && a.current_stage_index < 4 && a.status !== 'rejected').length,
        in_offer: apps.filter(a => a.current_stage_index === 4 && a.status !== 'rejected' && a.status !== 'hired').length,
        hired: apps.filter(a => a.status === 'hired').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
        active_in_pipeline: activeApps.length,
      };
      
      return stats;
    },
    enabled: !!userId,
  });

  return {
    aggregateStats,
    pipelineStats,
    isLoading: statsLoading || pipelineLoading,
  };
};
