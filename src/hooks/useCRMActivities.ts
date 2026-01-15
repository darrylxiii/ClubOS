import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import type { CRMActivity, ActivityOutcome } from '@/types/crm-activities';

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
  const queryClient = useQueryClient();
  const limit = options.limit || 20;

  const fetchActivities = async ({ pageParam = 0 }) => {
    let query = supabase
      .from('crm_activities')
      .select(`
        *,
        owner:profiles!crm_activities_owner_id_fkey(full_name, avatar_url),
        prospect:crm_prospects!crm_activities_prospect_id_fkey(full_name, company_name)
      `)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('due_time', { ascending: true, nullsFirst: false })
      .range(pageParam * limit, (pageParam + 1) * limit - 1);

    if (options.prospectId) {
      query = query.eq('prospect_id', options.prospectId);
    }

    if (options.ownerId) {
      query = query.eq('owner_id', options.ownerId);
    }

    const today = new Date().toISOString().split('T')[0];

    // Accurate filtering matching frontend logic
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

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((a: any) => ({
      ...a,
      owner_name: a.owner?.full_name,
      owner_avatar: a.owner?.avatar_url,
      prospect_name: a.prospect?.full_name,
      prospect_company: a.prospect?.company_name,
    }));
  };

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['crm-activities', options],
    queryFn: fetchActivities,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined;
    },
    staleTime: 1000 * 60 * 1, // 1 minute stale time
  });

  const activities = data?.pages.flatMap(page => page) || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (activity: Partial<CRMActivity>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('crm_activities')
        .insert({
          ...activity,
          owner_id: activity.owner_id || user?.id,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      notify.success('Activity created');
    },
    onError: () => notify.error('Failed to create activity')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CRMActivity> }) => {
      const { error } = await supabase.from('crm_activities').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
    },
    onError: () => notify.error('Failed to update activity')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      notify.success('Activity deleted');
    },
    onError: () => notify.error('Failed to delete activity')
  });

  return {
    activities,
    loading: isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['crm-activities'] }),
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createActivity: createMutation.mutateAsync,
    updateActivity: (id: string, updates: Partial<CRMActivity>) => updateMutation.mutateAsync({ id, updates }),
    completeActivity: (id: string, outcome?: ActivityOutcome, notes?: string) =>
      updateMutation.mutateAsync({
        id,
        updates: { is_done: true, done_at: new Date().toISOString(), outcome, outcome_notes: notes }
      }),
    deleteActivity: deleteMutation.mutateAsync,
  };
}
