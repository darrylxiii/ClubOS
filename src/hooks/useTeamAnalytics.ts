import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format } from 'date-fns';

export type Period = 'weekly' | 'monthly' | 'quarterly' | 'annual';

function getPeriodStart(period: Period): string {
  const now = new Date();
  switch (period) {
    case 'weekly':
      return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'monthly':
      return format(startOfMonth(now), 'yyyy-MM-dd');
    case 'quarterly':
      return format(startOfQuarter(now), 'yyyy-MM-dd');
    case 'annual':
      return format(startOfYear(now), 'yyyy-MM-dd');
  }
}

export function useTeamLeaderboard(period: Period = 'monthly') {
  const periodStart = getPeriodStart(period);

  return useQuery({
    queryKey: ['team-leaderboard', period],
    queryFn: async () => {
      // Get all employees with their profiles
      const { data: employees } = await supabase
        .from('employee_profiles')
        .select('id, user_id');

      if (!employees?.length) return [];

      // Get applications per employee
      const { data: applications } = await supabase
        .from('applications')
        .select('sourced_by, status')
        .gte('created_at', periodStart)
        .not('sourced_by', 'is', null);

      // Get commissions per employee
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('employee_id, gross_amount')
        .gte('created_at', periodStart);

      // Get profiles for names
      const userIds = employees.map(e => e.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Build leaderboard
      const leaderboard = employees.map(emp => {
        const profile = profiles?.find(p => p.id === emp.user_id);
        const empApplications = applications?.filter(a => a.sourced_by === emp.user_id) || [];
        const empCommissions = commissions?.filter(c => c.employee_id === emp.id) || [];

        return {
          id: emp.id,
          user_id: emp.user_id,
          name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url,
          candidates_sourced: empApplications.length,
          placements: empApplications.filter(a => a.status === 'hired').length,
          revenue: empCommissions.reduce((sum, c) => sum + (c.gross_amount || 0), 0),
        };
      });

      // Sort by placements, then revenue
      return leaderboard.sort((a, b) => {
        if (b.placements !== a.placements) return b.placements - a.placements;
        return b.revenue - a.revenue;
      });
    },
  });
}

export function useHistoricalTrends(userId: string, months = 6) {
  return useQuery({
    queryKey: ['historical-trends', userId, months],
    queryFn: async () => {
      const trends = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const { data: applications } = await supabase
          .from('applications')
          .select('id, status')
          .eq('sourced_by', userId)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const { data: employeeProfile } = await supabase
          .from('employee_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        let revenue = 0;
        if (employeeProfile) {
          const { data: commissions } = await supabase
            .from('employee_commissions')
            .select('gross_amount')
            .eq('employee_id', employeeProfile.id)
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          revenue = commissions?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;
        }

        trends.push({
          month: format(monthStart, 'MMM yyyy'),
          candidates_sourced: applications?.length || 0,
          placements: applications?.filter(a => a.status === 'hired').length || 0,
          revenue,
        });
      }

      return trends;
    },
    enabled: !!userId,
  });
}

export function useBenchmarks(userId: string, period: Period = 'monthly') {
  const periodStart = getPeriodStart(period);

  return useQuery({
    queryKey: ['benchmarks', userId, period],
    queryFn: async () => {
      // Get all team data for comparison
      const { data: allApplications } = await supabase
        .from('applications')
        .select('sourced_by, status')
        .gte('created_at', periodStart)
        .not('sourced_by', 'is', null);

      const { data: allCommissions } = await supabase
        .from('employee_commissions')
        .select('employee_id, gross_amount')
        .gte('created_at', periodStart);

      const { data: employeeProfile } = await supabase
        .from('employee_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Group by employee
      const employeeStats = new Map<string, { sourced: number; placed: number; revenue: number }>();
      
      allApplications?.forEach(app => {
        if (!app.sourced_by) return;
        const stats = employeeStats.get(app.sourced_by) || { sourced: 0, placed: 0, revenue: 0 };
        stats.sourced++;
        if (app.status === 'hired') stats.placed++;
        employeeStats.set(app.sourced_by, stats);
      });

      allCommissions?.forEach(comm => {
        const empProfile = employeeProfile?.id === comm.employee_id ? userId : null;
        if (empProfile) {
          const stats = employeeStats.get(empProfile) || { sourced: 0, placed: 0, revenue: 0 };
          stats.revenue += comm.gross_amount || 0;
          employeeStats.set(empProfile, stats);
        }
      });

      // Calculate averages
      const statsArray = Array.from(employeeStats.values());
      const avgSourced = statsArray.reduce((sum, s) => sum + s.sourced, 0) / (statsArray.length || 1);
      const avgPlaced = statsArray.reduce((sum, s) => sum + s.placed, 0) / (statsArray.length || 1);
      const avgRevenue = statsArray.reduce((sum, s) => sum + s.revenue, 0) / (statsArray.length || 1);

      // Get user stats
      const userStats = employeeStats.get(userId) || { sourced: 0, placed: 0, revenue: 0 };

      // Calculate top 10%
      const sortedBySourced = [...statsArray].sort((a, b) => b.sourced - a.sourced);
      const top10Sourced = sortedBySourced[Math.floor(sortedBySourced.length * 0.1)]?.sourced || 0;
      const sortedByPlaced = [...statsArray].sort((a, b) => b.placed - a.placed);
      const top10Placed = sortedByPlaced[Math.floor(sortedByPlaced.length * 0.1)]?.placed || 0;
      const sortedByRevenue = [...statsArray].sort((a, b) => b.revenue - a.revenue);
      const top10Revenue = sortedByRevenue[Math.floor(sortedByRevenue.length * 0.1)]?.revenue || 0;

      return {
        user: userStats,
        teamAverage: { sourced: avgSourced, placed: avgPlaced, revenue: avgRevenue },
        top10: { sourced: top10Sourced, placed: top10Placed, revenue: top10Revenue },
      };
    },
    enabled: !!userId,
  });
}
