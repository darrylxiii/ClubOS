import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GrowthMetrics {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  userGrowth7d: number;
  userGrowth30d: number;
  
  totalCompanies: number;
  newCompanies7d: number;
  newCompanies30d: number;
  companyGrowth7d: number;
  companyGrowth30d: number;
  
  totalJobs: number;
  activeJobs: number;
  newJobs30d: number;
  jobGrowth30d: number;
  
  totalApplications: number;
  newApps7d: number;
  newApps30d: number;
  appGrowth30d: number;
  
  onlineUsers: number;
  active24h: number;
  active7d: number;
}

const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export function usePlatformGrowth() {
  return useQuery<GrowthMetrics>({
    queryKey: ['platform-growth'],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      // Fetch all metrics in parallel
      const [
        { count: totalUsers },
        { count: newUsers7d },
        { count: newUsersPrevious7d },
        { count: newUsers30d },
        { count: newUsersPrevious30d },
        
        { count: totalCompanies },
        { count: newCompanies7d },
        { count: newCompaniesPrevious7d },
        { count: newCompanies30d },
        { count: newCompaniesPrevious30d },
        
        { count: totalJobs },
        { count: activeJobs },
        { count: newJobs30d },
        { count: newJobsPrevious30d },
        
        { count: totalApplications },
        { count: newApps7d },
        { count: newApps30d },
        { count: newAppsPrevious30d },
        
        { count: onlineUsers },
        { count: active24h },
        { count: active7d }
      ] = await Promise.all([
        // Users
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        // Companies
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        // Jobs
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase.from('jobs').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('jobs').select('*', { count: 'exact', head: true })
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        // Applications
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('applications').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('applications').select('*', { count: 'exact', head: true })
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        // Activity
        supabase.from('user_activity_tracking').select('*', { count: 'exact', head: true })
          .gte('last_activity_at', twoMinutesAgo.toISOString()),
        supabase.from('user_activity_tracking').select('*', { count: 'exact', head: true })
          .gte('last_activity_at', twentyFourHoursAgo.toISOString()),
        supabase.from('user_activity_tracking').select('*', { count: 'exact', head: true })
          .gte('last_activity_at', sevenDaysAgo.toISOString())
      ]);

      return {
        totalUsers: totalUsers || 0,
        newUsers7d: newUsers7d || 0,
        newUsers30d: newUsers30d || 0,
        userGrowth7d: calculateGrowth(newUsers7d || 0, newUsersPrevious7d || 0),
        userGrowth30d: calculateGrowth(newUsers30d || 0, newUsersPrevious30d || 0),
        
        totalCompanies: totalCompanies || 0,
        newCompanies7d: newCompanies7d || 0,
        newCompanies30d: newCompanies30d || 0,
        companyGrowth7d: calculateGrowth(newCompanies7d || 0, newCompaniesPrevious7d || 0),
        companyGrowth30d: calculateGrowth(newCompanies30d || 0, newCompaniesPrevious30d || 0),
        
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        newJobs30d: newJobs30d || 0,
        jobGrowth30d: calculateGrowth(newJobs30d || 0, newJobsPrevious30d || 0),
        
        totalApplications: totalApplications || 0,
        newApps7d: newApps7d || 0,
        newApps30d: newApps30d || 0,
        appGrowth30d: calculateGrowth(newApps30d || 0, newAppsPrevious30d || 0),
        
        onlineUsers: onlineUsers || 0,
        active24h: active24h || 0,
        active7d: active7d || 0
      };
    },
    refetchInterval: 60000,
    staleTime: 30000
  });
}
