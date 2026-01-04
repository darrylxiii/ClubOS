import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StrategistRanking {
  id: string;
  strategist_id: string;
  strategist_name: string;
  avatar_url: string | null;
  placements_count: number;
  revenue_generated: number;
  deals_closed: number;
  deals_in_pipeline: number;
  avg_time_to_fill: number;
  conversion_rate: number;
  candidate_nps_avg: number | null;
  applications_sourced: number;
  interviews_scheduled: number;
  offers_extended: number;
  offers_accepted: number;
  ranking_score: number;
  rank_position: number;
  trend: 'up' | 'down' | 'stable';
}

export function useStrategistLeaderboard(period: 'weekly' | 'monthly' | 'quarterly' = 'monthly') {
  return useQuery({
    queryKey: ['strategist-leaderboard', period],
    queryFn: async (): Promise<StrategistRanking[]> => {
      // Get strategist performance from snapshots or calculate live
      const { data: snapshots, error: snapshotError } = await supabase
        .from('strategist_performance_snapshots')
        .select(`
          *,
          profiles:strategist_id(full_name, avatar_url)
        `)
        .eq('period_type', period)
        .order('ranking_score', { ascending: false })
        .limit(20);

      if (snapshotError) throw snapshotError;

      // If no snapshots, calculate live from existing data
      if (!snapshots || snapshots.length === 0) {
        return calculateLiveRankings();
      }

      return snapshots.map((s: any, idx: number) => ({
        id: s.id,
        strategist_id: s.strategist_id,
        strategist_name: s.profiles?.full_name || 'Unknown',
        avatar_url: s.profiles?.avatar_url,
        placements_count: s.placements_count || 0,
        revenue_generated: s.revenue_generated || 0,
        deals_closed: s.deals_closed || 0,
        deals_in_pipeline: s.deals_in_pipeline || 0,
        avg_time_to_fill: s.avg_time_to_fill || 0,
        conversion_rate: s.conversion_rate || 0,
        candidate_nps_avg: s.candidate_nps_avg,
        applications_sourced: s.applications_sourced || 0,
        interviews_scheduled: s.interviews_scheduled || 0,
        offers_extended: s.offers_extended || 0,
        offers_accepted: s.offers_accepted || 0,
        ranking_score: s.ranking_score || 0,
        rank_position: s.rank_position || idx + 1,
        trend: 'stable' as const,
      }));
    },
    staleTime: 60000,
  });
}

async function calculateLiveRankings(): Promise<StrategistRanking[]> {
  // Get strategists
  const { data: strategists } = await supabase
    .from('user_roles')
    .select('user_id, profiles:user_id(full_name, avatar_url)')
    .eq('role', 'strategist');

  if (!strategists?.length) return [];

  // Get placements per strategist
  const { data: applications } = await supabase
    .from('applications')
    .select('sourced_by, status, created_at, updated_at')
    .not('sourced_by', 'is', null);

  const rankings: StrategistRanking[] = strategists.map((s: any, idx: number) => {
    const userApps = (applications || []).filter((a: any) => a.sourced_by === s.user_id);
    
    const placements = userApps.filter((a: any) => a.status === 'hired').length;
    const revenue = placements * 25000; // Estimated avg fee
    
    const score = (revenue / 1000) * 0.3 + placements * 10 * 0.25;

    return {
      id: s.user_id,
      strategist_id: s.user_id,
      strategist_name: s.profiles?.full_name || 'Unknown',
      avatar_url: s.profiles?.avatar_url,
      placements_count: placements,
      revenue_generated: revenue,
      deals_closed: placements,
      deals_in_pipeline: userApps.filter((a: any) => !['hired', 'rejected'].includes(a.status)).length,
      avg_time_to_fill: 0,
      conversion_rate: userApps.length > 0 ? (placements / userApps.length) * 100 : 0,
      candidate_nps_avg: null,
      applications_sourced: userApps.length,
      interviews_scheduled: 0,
      offers_extended: 0,
      offers_accepted: 0,
      ranking_score: score,
      rank_position: idx + 1,
      trend: 'stable' as const,
    };
  });

  // Sort by score and assign rank
  rankings.sort((a, b) => b.ranking_score - a.ranking_score);
  rankings.forEach((r, idx) => { r.rank_position = idx + 1; });

  return rankings;
}

export function useStrategistPerformance(strategistId: string) {
  return useQuery({
    queryKey: ['strategist-performance', strategistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategist_performance_snapshots')
        .select('*')
        .eq('strategist_id', strategistId)
        .order('snapshot_date', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: !!strategistId,
  });
}
