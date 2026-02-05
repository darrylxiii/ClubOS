import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityEntryType = 
  | 'email_sent' 
  | 'email_opened' 
  | 'email_clicked' 
  | 'reply_received' 
  | 'call_made' 
  | 'meeting_scheduled' 
  | 'stage_changed' 
  | 'note_added'
  | 'field_updated' 
  | 'owner_changed'
  | 'task_completed'
  | 'activity_created';

export interface ActivityEntry {
  id: string;
  type: ActivityEntryType;
  description: string;
  performedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  metadata?: Record<string, string>;
}

interface UseProspectActivityLogOptions {
  prospectId: string;
  typeFilter?: ActivityEntryType | 'all';
  limit?: number;
}

export function useProspectActivityLog({ 
  prospectId, 
  typeFilter = 'all',
  limit = 50 
}: UseProspectActivityLogOptions) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!prospectId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch CRM activities for this prospect
      let query = supabase
        .from('crm_activities')
        .select(`
          id,
          activity_type,
          subject,
          description,
          outcome,
          is_done,
          done_at,
          created_at,
          updated_at,
          metadata,
          created_by,
          owner:profiles!crm_activities_owner_id_fkey(id, full_name, avatar_url),
          creator:profiles!crm_activities_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: activitiesData, error: activitiesError } = await query;

      if (activitiesError) throw activitiesError;

      // Transform CRM activities to ActivityEntry format
      const transformedActivities: ActivityEntry[] = (activitiesData || []).map((activity: any) => {
        let type: ActivityEntryType = 'activity_created';
        let description = activity.subject || 'Activity created';

        // Map activity_type to our log types
        if (activity.is_done) {
          type = 'task_completed';
          description = `Completed: ${activity.subject}`;
        } else if (activity.activity_type === 'email') {
          type = 'email_sent';
          description = `Email: ${activity.subject}`;
        } else if (activity.activity_type === 'call') {
          type = 'call_made';
          description = `Call: ${activity.subject}`;
        } else if (activity.activity_type === 'meeting') {
          type = 'meeting_scheduled';
          description = `Meeting: ${activity.subject}`;
        } else if (activity.activity_type === 'note') {
          type = 'note_added';
          description = `Note: ${activity.subject}`;
        }

        const performer = activity.creator || activity.owner;

        return {
          id: activity.id,
          type,
          description,
          performedBy: {
            id: performer?.id || 'system',
            name: performer?.full_name || 'System',
            avatar: performer?.avatar_url,
          },
          timestamp: activity.is_done ? activity.done_at : activity.created_at,
          metadata: activity.metadata as Record<string, string> | undefined,
        };
      });

      // Apply type filter
      const filteredActivities = typeFilter === 'all' 
        ? transformedActivities 
        : transformedActivities.filter(a => a.type === typeFilter);

      setActivities(filteredActivities.slice(0, limit));
    } catch (err) {
      console.error('Error fetching prospect activity log:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [prospectId, typeFilter, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!prospectId) return;

    const channel = supabase
      .channel(`prospect-activity-${prospectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_activities',
          filter: `prospect_id=eq.${prospectId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prospectId, fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
}
