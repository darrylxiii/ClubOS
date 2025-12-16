import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'member' | 'viewer';
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(m => ({
        ...m,
        profile: m.profiles,
      })) as WorkspaceMember[];
    },
    enabled: !!workspaceId && !!user?.id,
  });

  const updateMemberRole = useMutation({
    mutationFn: async (params: {
      memberId: string;
      role: WorkspaceMember['role'];
    }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: params.role })
        .eq('id', params.memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast.success('Role updated');
    },
    onError: (error) => {
      toast.error('Failed to update role');
      console.error('Update role error:', error);
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Member removed');
    },
    onError: (error) => {
      toast.error('Failed to remove member');
      console.error('Remove member error:', error);
    },
  });

  const transferOwnership = useMutation({
    mutationFn: async (params: {
      currentOwnerId: string;
      newOwnerId: string;
    }) => {
      if (!workspaceId) throw new Error('No workspace ID');

      // Update current owner to admin
      const { error: demoteError } = await supabase
        .from('workspace_members')
        .update({ role: 'admin' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', params.currentOwnerId);

      if (demoteError) throw demoteError;

      // Update new owner
      const { error: promoteError } = await supabase
        .from('workspace_members')
        .update({ role: 'owner' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', params.newOwnerId);

      if (promoteError) throw promoteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Ownership transferred');
    },
    onError: (error) => {
      toast.error('Failed to transfer ownership');
      console.error('Transfer ownership error:', error);
    },
  });

  const currentUserMember = membersQuery.data?.find(m => m.user_id === user?.id);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = currentUserMember?.role === 'admin' || isOwner;
  const canEdit = ['owner', 'admin', 'editor'].includes(currentUserMember?.role || '');

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    currentUserMember,
    isOwner,
    isAdmin,
    canEdit,
    updateMemberRole,
    removeMember,
    transferOwnership,
  };
}
