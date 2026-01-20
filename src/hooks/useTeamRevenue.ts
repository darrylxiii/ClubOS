import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMemberRevenue {
  id: string;
  name: string;
  avatarUrl?: string;
  revenue: number;
  deals: number;
  rank: number;
  previousRank?: number;
  isCurrentUser?: boolean;
}

export const useTeamRevenue = (year?: number | 'all') => {
  const { user } = useAuth();
  const targetYear = year === 'all' ? null : (year || new Date().getFullYear());

  return useQuery({
    queryKey: ['team-revenue', targetYear],
    queryFn: async () => {
      // Use optimized RPC function to eliminate N+1 queries
      const { data, error } = await supabase.rpc('get_team_revenue_leaderboard', {
        target_year: targetYear,
      });

      if (error) {
        console.error('RPC error, falling back to direct query:', error);
        // Fallback to direct query if RPC fails
        return fetchTeamRevenueFallback(targetYear, user?.id);
      }

      // Map RPC results to TeamMemberRevenue format
      const members: TeamMemberRevenue[] = (data || []).map((row: any, index: number) => ({
        id: row.user_id,
        name: row.full_name,
        avatarUrl: row.avatar_url || undefined,
        revenue: Math.round(Number(row.revenue) || 0),
        deals: Number(row.deal_count) || 0,
        rank: index + 1,
        isCurrentUser: row.user_id === user?.id,
      }));

      return members;
    },
    enabled: true,
  });
};

// Fallback function for backwards compatibility
async function fetchTeamRevenueFallback(
  targetYear: number | null,
  currentUserId?: string
): Promise<TeamMemberRevenue[]> {
  // Build the query based on year filter
  let query = supabase
    .from('placement_fees')
    .select('id, fee_amount, sourced_by, closed_by, added_by, hired_date');

  if (targetYear) {
    const yearStart = `${targetYear}-01-01`;
    const yearEnd = `${targetYear + 1}-01-01`;
    query = query.gte('hired_date', yearStart).lt('hired_date', yearEnd);
  }

  const { data: placements, error: placementsError } = await query;

  if (placementsError) throw placementsError;

  // Get unique user IDs from placements
  const potentialUserIds = new Set<string>();
  (placements || []).forEach((p) => {
    if (p.sourced_by) potentialUserIds.add(p.sourced_by);
    if (p.closed_by) potentialUserIds.add(p.closed_by);
    if (p.added_by) potentialUserIds.add(p.added_by);
  });

  if (potentialUserIds.size === 0) {
    return [];
  }

  // Fetch profiles for these users
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', Array.from(potentialUserIds));

  if (profilesError) throw profilesError;

  // Build a map of valid profiles
  const profileMap = new Map<
    string,
    { id: string; full_name: string | null; avatar_url: string | null }
  >();
  (profiles || []).forEach((p) => {
    if (p.full_name) {
      profileMap.set(p.id, p);
    }
  });

  // Calculate revenue attribution per user
  const userRevenue = new Map<string, { revenue: number; deals: Set<string> }>();

  const initUser = (userId: string) => {
    if (!profileMap.has(userId)) return false;
    if (!userRevenue.has(userId)) {
      userRevenue.set(userId, { revenue: 0, deals: new Set() });
    }
    return true;
  };

  (placements || []).forEach((p) => {
    const feeAmount = Number(p.fee_amount) || 0;

    const hasValidSourcer = p.sourced_by && profileMap.has(p.sourced_by);
    const hasValidCloser = p.closed_by && profileMap.has(p.closed_by);
    const hasValidAdder = p.added_by && profileMap.has(p.added_by);

    if (hasValidSourcer && hasValidCloser) {
      initUser(p.sourced_by);
      initUser(p.closed_by);

      const sourcerData = userRevenue.get(p.sourced_by)!;
      sourcerData.revenue += feeAmount * 0.5;
      sourcerData.deals.add(p.id);

      const closerData = userRevenue.get(p.closed_by)!;
      closerData.revenue += feeAmount * 0.5;
      closerData.deals.add(p.id);
    } else if (hasValidSourcer) {
      initUser(p.sourced_by);
      const data = userRevenue.get(p.sourced_by)!;
      data.revenue += feeAmount;
      data.deals.add(p.id);
    } else if (hasValidCloser) {
      initUser(p.closed_by);
      const data = userRevenue.get(p.closed_by)!;
      data.revenue += feeAmount;
      data.deals.add(p.id);
    } else if (hasValidAdder) {
      initUser(p.added_by);
      const data = userRevenue.get(p.added_by)!;
      data.revenue += feeAmount;
      data.deals.add(p.id);
    }
  });

  // Convert to array and sort by revenue
  const members: TeamMemberRevenue[] = [];

  userRevenue.forEach((data, odlUserId) => {
    const profile = profileMap.get(odlUserId);
    if (!profile?.full_name) return;

    members.push({
      id: odlUserId,
      name: profile.full_name,
      avatarUrl: profile.avatar_url || undefined,
      revenue: Math.round(data.revenue),
      deals: data.deals.size,
      rank: 0,
      isCurrentUser: odlUserId === currentUserId,
    });
  });

  members.sort((a, b) => b.revenue - a.revenue);
  members.forEach((m, i) => {
    m.rank = i + 1;
  });

  return members;
}
