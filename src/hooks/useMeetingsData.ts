import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface MeetingStats {
  upcoming: number;
  today: number;
  week: number;
  analyzed: number;
  hours: number;
}

export function useMeetingsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const meetingsQuery = useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const [{ data: hosted, error: hostedErr }, { data: participant, error: partErr }] = await Promise.all([
        supabase.from('meetings').select('*').eq('host_id', user.id),
        supabase.from('meeting_participants').select('meeting_id, meetings(*)').eq('user_id', user.id),
      ]);

      if (hostedErr) throw hostedErr;
      if (partErr) throw partErr;

      const allMeetings = [
        ...(hosted || []),
        ...(participant?.map(p => p.meetings).filter(Boolean) || []),
      ];

      return Array.from(
        new Map(allMeetings.map(m => [m.id, m])).values()
      ).sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
    },
    enabled: !!user,
    staleTime: 30_000,
    meta: { errorMessage: 'Failed to load meetings' },
  });

  const statsQuery = useQuery<MeetingStats>({
    queryKey: ['meeting-stats', user?.id],
    queryFn: async () => {
      if (!user) return { upcoming: 0, today: 0, week: 0, analyzed: 0, hours: 0 };

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [upcomingRes, todayRes, weekRes, analyzedRes] = await Promise.all([
        supabase.from('meetings').select('*', { count: 'exact', head: true }).gte('scheduled_start', new Date().toISOString()),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).gte('scheduled_start', todayStart).lte('scheduled_start', todayEnd),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).gte('scheduled_start', todayStart).lte('scheduled_start', weekEnd),
        supabase.from('meeting_insights').select('*', { count: 'exact', head: true }),
      ]);

      return {
        upcoming: upcomingRes.count || 0,
        today: todayRes.count || 0,
        week: weekRes.count || 0,
        analyzed: analyzedRes.count || 0,
        hours: (analyzedRes.count || 0) * 0.5,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('meetings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['meetings', user.id] });
        queryClient.invalidateQueries({ queryKey: ['meeting-stats', user.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const deleteMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
      if (error) throw error;
      toast.success('Meeting deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });
    } catch (error: unknown) {
      logger.error('Error deleting meeting:', { error });
      toast.error('Failed to delete meeting');
    }
  };

  return {
    meetings: meetingsQuery.data || [],
    loading: meetingsQuery.isLoading,
    stats: statsQuery.data || { upcoming: 0, today: 0, week: 0, analyzed: 0, hours: 0 },
    deleteMeeting,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-stats', user?.id] });
    },
  };
}
