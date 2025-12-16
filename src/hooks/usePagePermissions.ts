import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PagePermission {
  id: string;
  page_id: string;
  user_id: string | null;
  email: string | null;
  permission_level: 'view' | 'comment' | 'edit';
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
  user_name?: string;
}

export function usePagePermissions(pageId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ['page-permissions', pageId],
    queryFn: async () => {
      if (!pageId) return [];

      const { data, error } = await supabase
        .from('page_permissions')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names separately
      const userIds = [...new Set(data.map(p => p.user_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds as string[]);
        
        if (profiles) {
          userMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']));
        }
      }

      return data.map(p => ({
        ...p,
        permission_level: (p.permission_level || 'view') as 'view' | 'comment' | 'edit',
        user_name: p.user_id ? userMap[p.user_id] || p.email : p.email,
      })) as PagePermission[];
    },
    enabled: !!pageId && !!user?.id,
  });

  const inviteUser = useMutation({
    mutationFn: async (params: {
      email: string;
      permission_level: 'view' | 'comment' | 'edit';
    }) => {
      if (!user?.id || !pageId) throw new Error('Not authenticated');

      // Check if user already has permission
      const { data: existing } = await supabase
        .from('page_permissions')
        .select('id')
        .eq('page_id', pageId)
        .eq('email', params.email)
        .maybeSingle();

      if (existing) {
        throw new Error('User already has access to this page');
      }

      const { data, error } = await supabase
        .from('page_permissions')
        .insert({
          page_id: pageId,
          email: params.email,
          permission_level: params.permission_level,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions', pageId] });
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to invite user');
    },
  });

  const updatePermission = useMutation({
    mutationFn: async (params: {
      permissionId: string;
      permission_level: 'view' | 'comment' | 'edit';
    }) => {
      const { error } = await supabase
        .from('page_permissions')
        .update({ permission_level: params.permission_level })
        .eq('id', params.permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions', pageId] });
      toast.success('Permission updated');
    },
    onError: () => {
      toast.error('Failed to update permission');
    },
  });

  const removePermission = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from('page_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions', pageId] });
      toast.success('Access removed');
    },
    onError: () => {
      toast.error('Failed to remove access');
    },
  });

  return {
    permissions: permissionsQuery.data || [],
    isLoading: permissionsQuery.isLoading,
    inviteUser,
    updatePermission,
    removePermission,
  };
}
