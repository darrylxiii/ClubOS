import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  user_id: string;
  last_activity: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    role: string | null;
  };
}

export const useTeamActivity = (jobId: string) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pipeline_audit_logs')
        .select(`
          user_id,
          created_at,
          profiles!inner (
            id,
            full_name,
            avatar_url,
            email,
            role
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

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
