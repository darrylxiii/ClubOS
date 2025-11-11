import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HealthMetrics {
  healthScore: number;
  alerts: Array<{ id: string; message: string; severity: 'warning' | 'info' }>;
  avgAppsPerJob: number;
  jobsFilledThisMonth: number;
  activeMeetings: number;
}

export function usePlatformHealth() {
  return useQuery<HealthMetrics>({
    queryKey: ['platform-health'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch metrics in parallel
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalApplications },
        { count: hiredApplications },
        { count: totalCompanies },
        { count: companiesWithJobs },
        { count: activeJobs },
        { count: jobsFilledThisMonth },
        { count: activeMeetings },
        { count: totalJobs }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_activity_tracking').select('*', { count: 'exact', head: true })
          .gte('last_activity_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true })
          .eq('status', 'hired'),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('company_id', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase.from('jobs').select('*', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase.from('applications').select('*', { count: 'exact', head: true })
          .eq('status', 'hired')
          .gte('updated_at', thirtyDaysAgo.toISOString()),
        supabase.from('meetings').select('*', { count: 'exact', head: true })
          .gte('scheduled_for', now.toISOString()),
        supabase.from('jobs').select('*', { count: 'exact', head: true })
      ]);

      // Calculate health score components
      const userRetention = totalUsers && activeUsers ? (activeUsers / totalUsers) * 100 : 0;
      const conversionRate = totalApplications && hiredApplications ? (hiredApplications / totalApplications) * 100 : 0;
      const companyEngagement = totalCompanies && companiesWithJobs ? (companiesWithJobs / totalCompanies) * 100 : 0;
      
      // Composite health score (weighted average)
      const healthScore = Math.round(
        (userRetention * 0.3) + 
        (conversionRate * 0.3) + 
        (companyEngagement * 0.4)
      );

      // Generate alerts
      const alerts: Array<{ id: string; message: string; severity: 'warning' | 'info' }> = [];
      
      if ((activeJobs || 0) === 0) {
        alerts.push({
          id: 'no-open-jobs',
          message: 'No jobs currently open. Consider reaching out to partners.',
          severity: 'warning'
        });
      }
      
      if ((activeUsers || 0) < (totalUsers || 0) * 0.2) {
        alerts.push({
          id: 'low-engagement',
          message: `Only ${activeUsers} users active in last 7 days. User engagement is low.`,
          severity: 'warning'
        });
      }

      if ((activeMeetings || 0) > 20) {
        alerts.push({
          id: 'high-meetings',
          message: `${activeMeetings} upcoming meetings scheduled. Platform activity is strong!`,
          severity: 'info'
        });
      }

      const avgAppsPerJob = totalJobs && totalApplications ? Number((totalApplications / totalJobs).toFixed(1)) : 0;

      return {
        healthScore,
        alerts,
        avgAppsPerJob,
        jobsFilledThisMonth: jobsFilledThisMonth || 0,
        activeMeetings: activeMeetings || 0
      };
    },
    refetchInterval: 60000,
    staleTime: 30000
  });
}
