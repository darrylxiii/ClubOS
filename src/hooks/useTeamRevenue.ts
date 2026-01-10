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

export const useTeamRevenue = (year?: number) => {
  const { user } = useAuth();
  const targetYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['team-revenue', targetYear],
    queryFn: async () => {
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear + 1}-01-01`;

      // Fetch placements for the year with attribution
      // Using hired_date instead of placement_date, and added_by as fallback instead of owner_id
      const { data: placements, error: placementsError } = await supabase
        .from('placement_fees')
        .select('id, fee_amount, sourced_by, closed_by, added_by, hired_date')
        .gte('hired_date', yearStart)
        .lt('hired_date', yearEnd);

      if (placementsError) throw placementsError;

      // Get unique user IDs from placements
      const userIds = new Set<string>();
      (placements || []).forEach(p => {
        if (p.sourced_by) userIds.add(p.sourced_by);
        if (p.closed_by) userIds.add(p.closed_by);
        if (p.added_by) userIds.add(p.added_by);
      });

      if (userIds.size === 0) {
        return [];
      }

      // Fetch profiles for these users (using full_name instead of first_name/last_name)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      const profileMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();
      (profiles || []).forEach(p => profileMap.set(p.id, p));

      // Calculate revenue attribution per user
      // Attribution: 50% closer, 50% sourcer (or 100% added_by if no sourcer/closer)
      const userRevenue = new Map<string, { revenue: number; deals: Set<string> }>();

      (placements || []).forEach(p => {
        const feeAmount = Number(p.fee_amount) || 0;
        
        const initUser = (userId: string) => {
          if (!userRevenue.has(userId)) {
            userRevenue.set(userId, { revenue: 0, deals: new Set() });
          }
        };

        if (p.sourced_by && p.closed_by) {
          // Split credit: 50% each
          initUser(p.sourced_by);
          initUser(p.closed_by);
          
          const sourcerData = userRevenue.get(p.sourced_by)!;
          sourcerData.revenue += feeAmount * 0.5;
          sourcerData.deals.add(p.id);
          
          const closerData = userRevenue.get(p.closed_by)!;
          closerData.revenue += feeAmount * 0.5;
          closerData.deals.add(p.id);
        } else if (p.sourced_by) {
          initUser(p.sourced_by);
          const data = userRevenue.get(p.sourced_by)!;
          data.revenue += feeAmount;
          data.deals.add(p.id);
        } else if (p.closed_by) {
          initUser(p.closed_by);
          const data = userRevenue.get(p.closed_by)!;
          data.revenue += feeAmount;
          data.deals.add(p.id);
        } else if (p.added_by) {
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
        const name = profile?.full_name || 'Unknown';
        
        members.push({
          id: odlUserId,
          name,
          avatarUrl: profile?.avatar_url || undefined,
          revenue: Math.round(data.revenue),
          deals: data.deals.size,
          rank: 0, // Will be set after sorting
          isCurrentUser: odlUserId === user?.id,
        });
      });

      // Sort by revenue descending and assign ranks
      members.sort((a, b) => b.revenue - a.revenue);
      members.forEach((m, i) => {
        m.rank = i + 1;
      });

      return members;
    },
    enabled: true,
  });
};
