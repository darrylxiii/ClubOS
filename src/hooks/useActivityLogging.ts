import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DailyActivity {
  id: string;
  user_id: string;
  date: string;
  outreach_count: number;
  calls_made: number;
  emails_sent: number;
  meetings_held: number;
  candidates_sourced: number;
  interviews_scheduled: number;
  notes: string | null;
  created_at: string;
}

export function useLogDailyActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (activity: Omit<DailyActivity, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('recruiter_activity_metrics')
        .upsert({
          user_id: user.id,
          date: activity.date,
          outreach_count: activity.outreach_count,
          calls_made: activity.calls_made,
          emails_sent: activity.emails_sent,
          meetings_held: activity.meetings_held,
          candidates_sourced: activity.candidates_sourced,
          interviews_scheduled: activity.interviews_scheduled,
          notes: activity.notes,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-activity'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });
}

export function useDailyActivity(userId?: string, startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['daily-activity', targetUserId, startDate, endDate],
    queryFn: async () => {
      if (!targetUserId) return [];

      let query = supabase
        .from('recruiter_activity_metrics')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: false });

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId,
  });
}

export function useActivityFeed(userId?: string, limit = 50) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['activity-feed', targetUserId, limit],
    queryFn: async () => {
      if (!targetUserId) return [];

      // Fetch recent applications created/updated by this user
      const { data: applications } = await supabase
        .from('applications')
        .select('id, candidate_full_name, position, status, created_at, updated_at')
        .eq('sourced_by', targetUserId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      // Combine and sort by date
      const feed = [
        ...(applications || []).map(app => ({
          id: app.id,
          type: 'application' as const,
          title: `${app.candidate_full_name} - ${app.position}`,
          status: app.status,
          timestamp: app.updated_at || app.created_at,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return feed.slice(0, limit);
    },
    enabled: !!targetUserId,
  });
}
