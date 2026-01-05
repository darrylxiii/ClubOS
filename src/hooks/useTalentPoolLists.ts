import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TalentPoolList {
  id: string;
  name: string;
  description: string | null;
  list_type: 'manual' | 'smart';
  smart_criteria: Record<string, unknown> | null;
  is_shared: boolean;
  shared_with: string[] | null;
  created_by: string;
  linked_job_id: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface ListMember {
  id: string;
  list_id: string;
  candidate_id: string;
  added_by: string;
  position: number | null;
  notes: string | null;
  added_at: string;
  candidate?: {
    id: string;
    full_name: string;
    email: string;
    current_company: string | null;
    current_title: string | null;
    talent_tier: string | null;
    move_probability: number | null;
  };
}

export function useTalentPoolLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ['talent-pool-lists', user?.id],
    queryFn: async () => {
      const { data: lists, error } = await supabase
        .from('talent_pool_lists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const listsWithCounts = await Promise.all(
        (lists || []).map(async (list) => {
          const { count } = await supabase
            .from('talent_pool_list_members')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          return {
            ...list,
            member_count: count || 0,
          } as unknown as TalentPoolList;
        })
      );

      return listsWithCounts;
    },
    enabled: !!user?.id,
  });

  const createListMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      list_type?: 'manual' | 'smart';
      smart_criteria?: Record<string, unknown>;
      linked_job_id?: string;
    }) => {
      const insertData = {
        name: data.name,
        description: data.description || null,
        list_type: data.list_type || 'manual',
        smart_criteria: data.smart_criteria || null,
        linked_job_id: data.linked_job_id || null,
        created_by: user!.id,
      };
      
      const { data: list, error } = await supabase
        .from('talent_pool_lists')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return list;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-lists'] });
      toast.success('List created');
    },
    onError: (error) => {
      toast.error('Failed to create list');
      console.error(error);
    },
  });

  const updateListMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      is_shared?: boolean;
      shared_with?: string[];
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('talent_pool_lists')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-lists'] });
      toast.success('List updated');
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('talent_pool_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-lists'] });
      toast.success('List deleted');
    },
  });

  return {
    lists: listsQuery.data || [],
    isLoading: listsQuery.isLoading,
    createList: createListMutation.mutateAsync,
    updateList: updateListMutation.mutateAsync,
    deleteList: deleteListMutation.mutateAsync,
    isCreating: createListMutation.isPending,
  };
}

export function useTalentPoolListDetail(listId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['talent-pool-list', listId],
    queryFn: async () => {
      if (!listId) return null;

      const { data, error } = await supabase
        .from('talent_pool_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (error) throw error;
      return data as unknown as TalentPoolList;
    },
    enabled: !!listId && !!user?.id,
  });

  const membersQuery = useQuery({
    queryKey: ['talent-pool-list-members', listId],
    queryFn: async () => {
      if (!listId) return [];

      const { data, error } = await supabase
        .from('talent_pool_list_members')
        .select(`
          *,
          candidate:candidate_profiles(
            id,
            full_name,
            email,
            current_company,
            current_title,
            talent_tier,
            move_probability
          )
        `)
        .eq('list_id', listId)
        .order('position', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as ListMember[];
    },
    enabled: !!listId && !!user?.id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { candidateId: string; notes?: string }) => {
      const { error } = await supabase
        .from('talent_pool_list_members')
        .insert({
          list_id: listId!,
          candidate_id: data.candidateId,
          added_by: user!.id,
          notes: data.notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-list-members', listId] });
      queryClient.invalidateQueries({ queryKey: ['talent-pool-lists'] });
      toast.success('Candidate added to list');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('talent_pool_list_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-list-members', listId] });
      queryClient.invalidateQueries({ queryKey: ['talent-pool-lists'] });
      toast.success('Candidate removed from list');
    },
  });

  return {
    list: listQuery.data,
    members: membersQuery.data || [],
    isLoading: listQuery.isLoading || membersQuery.isLoading,
    addMember: addMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
  };
}

// Smart list presets
export const SMART_LIST_PRESETS = [
  {
    name: 'Ready to Move',
    description: 'Candidates with 75%+ move probability',
    criteria: { move_probability_min: 75 },
    icon: 'TrendingUp',
  },
  {
    name: 'Hot Prospects',
    description: 'All hot tier candidates',
    criteria: { tiers: ['hot'] },
    icon: 'Flame',
  },
  {
    name: 'Needs Re-engagement',
    description: 'No contact in 60+ days',
    criteria: { days_since_contact_min: 60 },
    icon: 'Clock',
  },
  {
    name: 'New This Month',
    description: 'Added in the last 30 days',
    criteria: { created_days_ago_max: 30 },
    icon: 'Sparkles',
  },
  {
    name: 'Silver Medalists',
    description: 'Reached final stage but not placed',
    criteria: { reached_final: true, placed: false },
    icon: 'Medal',
  },
];
