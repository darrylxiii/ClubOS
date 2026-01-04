import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import type { CRMActivity, ActivityType, ActivityOutcome } from '@/types/crm-activities';

interface UseActivitiesOptions {
  prospectId?: string;
  ownerId?: string;
  dueToday?: boolean;
  overdue?: boolean;
  upcoming?: boolean;
  done?: boolean;
  limit?: number;
}

export function useCRMActivities(options: UseActivitiesOptions = {}) {
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('crm_activities')
        .select(`
          *,
          owner:profiles!crm_activities_owner_id_fkey(full_name, avatar_url),
          prospect:crm_prospects!crm_activities_prospect_id_fkey(full_name, company_name)
        `)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('due_time', { ascending: true, nullsFirst: false });

      if (options.prospectId) {
        query = query.eq('prospect_id', options.prospectId);
      }

      if (options.ownerId) {
        query = query.eq('owner_id', options.ownerId);
      }

      const today = new Date().toISOString().split('T')[0];

      if (options.dueToday) {
        query = query.eq('due_date', today).eq('is_done', false);
      }

      if (options.overdue) {
        query = query.lt('due_date', today).eq('is_done', false);
      }

      if (options.upcoming) {
        query = query.gt('due_date', today).eq('is_done', false);
      }

      if (options.done !== undefined) {
        query = query.eq('is_done', options.done);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedActivities: CRMActivity[] = (data || []).map((a: any) => ({
        ...a,
        owner_name: a.owner?.full_name,
        owner_avatar: a.owner?.avatar_url,
        prospect_name: a.prospect?.full_name,
        prospect_company: a.prospect?.company_name,
      }));

      setActivities(mappedActivities);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options.prospectId, options.ownerId, options.dueToday, options.overdue, options.upcoming, options.done, options.limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('crm-activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_activities',
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  const createActivity = async (activity: Partial<CRMActivity>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        prospect_id: activity.prospect_id || null,
        activity_type: activity.activity_type || 'task',
        subject: activity.subject || '',
        description: activity.description || null,
        due_date: activity.due_date || null,
        due_time: activity.due_time || null,
        priority: activity.priority || 0,
        owner_id: activity.owner_id || user?.id,
        created_by: user?.id,
      };
      
      const { data, error: createError } = await supabase
        .from('crm_activities')
        .insert(insertData)
        .select()
        .single();

      if (createError) throw createError;

      notify.success('Activity created', { description: `${activity.subject} scheduled` });

      fetchActivities();
      return data;
    } catch (err) {
      console.error('Error creating activity:', err);
      notify.error('Failed to create activity');
      return null;
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<CRMActivity>) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_activities')
        .update(updates)
        .eq('id', activityId);

      if (updateError) throw updateError;

      setActivities(prev =>
        prev.map(a => a.id === activityId ? { ...a, ...updates } : a)
      );

      return true;
    } catch (err) {
      console.error('Error updating activity:', err);
      notify.error('Failed to update activity');
      return false;
    }
  };

  const completeActivity = async (activityId: string, outcome?: ActivityOutcome, outcomeNotes?: string) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_activities')
        .update({
          is_done: true,
          done_at: new Date().toISOString(),
          outcome,
          outcome_notes: outcomeNotes,
        })
        .eq('id', activityId);

      if (updateError) throw updateError;

      setActivities(prev =>
        prev.map(a => a.id === activityId ? { ...a, is_done: true, done_at: new Date().toISOString(), outcome } : a)
      );

      notify.success('Activity completed');

      return true;
    } catch (err) {
      console.error('Error completing activity:', err);
      notify.error('Failed to complete activity');
      return false;
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', activityId);

      if (deleteError) throw deleteError;

      setActivities(prev => prev.filter(a => a.id !== activityId));

      notify.success('Activity deleted');

      return true;
    } catch (err) {
      console.error('Error deleting activity:', err);
      notify.error('Failed to delete activity');
      return false;
    }
  };

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    createActivity,
    updateActivity,
    completeActivity,
    deleteActivity,
  };
}
