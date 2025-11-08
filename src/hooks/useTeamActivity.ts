import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Only show real team contributions, not passive actions like views
const TEAM_ACTIVITY_ACTIONS = [
  'candidate_added',
  'candidate_advanced',
  'candidate_declined',
  'stage_changed_manual',
  'stage_added',
  'stage_removed',
  'stage_updated',
  'stage_reordered'
];

interface TeamMember {
  user_id: string;
  last_activity: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export const useTeamActivity = (jobId: string) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      
      // First get audit logs
      const { data: logs, error: logsError } = await supabase
        .from('pipeline_audit_logs')
        .select('user_id, created_at, action')
        .eq('job_id', jobId)
        .in('action', TEAM_ACTIVITY_ACTIONS)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      if (!logs || logs.length === 0) {
        setTeamMembers([]);
        return;
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(logs.map(log => log.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', uniqueUserIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine logs with profiles
      const data = logs
        .filter(log => profileMap.has(log.user_id))
        .map(log => ({
          user_id: log.user_id,
          created_at: log.created_at,
          action: log.action,
          profiles: profileMap.get(log.user_id)!
        }));

      // Get unique users by user_id, keeping the most recent activity
      const uniqueUsersMap = new Map<string, TeamMember>();
      data?.forEach((log: any) => {
        if (!uniqueUsersMap.has(log.user_id)) {
          uniqueUsersMap.set(log.user_id, {
            user_id: log.user_id,
            last_activity: log.created_at,
            profiles: log.profiles
          });
        }
      });

      // Convert to array and take top 3
      const uniqueUsers = Array.from(uniqueUsersMap.values()).slice(0, 3);
      setTeamMembers(uniqueUsers);
    } catch (err) {
      console.error('Error fetching team activity:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    fetchTeamMembers();

    // Set up real-time subscription
    const channel = supabase
      .channel(`team-activity-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_audit_logs',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          fetchTeamMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return { teamMembers, loading, error };
};
