import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'member' | 'viewer';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  // Joined data
  inviter_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  workspace?: {
    name: string;
    icon_emoji: string | null;
    type: string;
  };
}

export function useWorkspaceInvitations(workspaceId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invitationsQuery = useQuery({
    queryKey: ['workspace-invitations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // First get invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      if (!invitationsData || invitationsData.length === 0) return [];

      // Get profiles for inviters
      const inviterIds = [...new Set(invitationsData.map(i => i.invited_by))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', inviterIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      return invitationsData.map(inv => ({
        ...inv,
        inviter_profile: profilesMap.get(inv.invited_by) || { full_name: null, avatar_url: null },
      })) as WorkspaceInvitation[];
    },
    enabled: !!workspaceId && !!user?.id,
  });

  const createInvitation = useMutation({
    mutationFn: async (params: {
      email: string;
      role?: WorkspaceInvitation['role'];
    }) => {
      if (!workspaceId || !user?.id) throw new Error('Missing workspace or user');

      // Check if already invited
      const { data: existing } = await supabase
        .from('workspace_invitations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', params.email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existing) {
        throw new Error('This email has already been invited');
      }

      // Check if already a member
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', params.email.toLowerCase())
        .single();

      if (profiles) {
        const { data: existingMember } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', profiles.id)
          .single();

        if (existingMember) {
          throw new Error('This user is already a member');
        }
      }

      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email: params.email.toLowerCase(),
          role: params.role || 'member',
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function to send email
      try {
        await supabase.functions.invoke('send-workspace-invitation', {
          body: { invitationId: data.id },
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }

      return data as WorkspaceInvitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] });
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
      console.error('Create invitation error:', error);
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      // Update expiry
      const { error } = await supabase
        .from('workspace_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;

      // Resend email
      await supabase.functions.invoke('send-workspace-invitation', {
        body: { invitationId },
      });
      
      return invitationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] });
      toast.success('Invitation resent');
    },
    onError: (error, invitationId) => {
      toast.error('Failed to resend invitation', {
        action: {
          label: 'Retry',
          onClick: () => resendInvitation.mutate(invitationId),
        },
      });
      console.error('Resend invitation error:', error);
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      return invitationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] });
      toast.success('Invitation revoked');
    },
    onError: (error, invitationId) => {
      toast.error('Failed to revoke invitation', {
        action: {
          label: 'Retry',
          onClick: () => revokeInvitation.mutate(invitationId),
        },
      });
      console.error('Revoke invitation error:', error);
    },
  });

  return {
    invitations: invitationsQuery.data || [],
    isLoading: invitationsQuery.isLoading,
    createInvitation,
    resendInvitation,
    revokeInvitation,
  };
}

// Hook for accepting invitations (used on join page)
export function useAcceptInvitation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get invitation
      const { data: invitation, error: invError } = await supabase
        .from('workspace_invitations')
        .select('*, workspaces(*)')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Add user to workspace
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert([{
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: invitation.role ?? 'member',
          invited_by: invitation.invited_by,
          invited_at: invitation.created_at,
        }]);

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('You are already a member of this workspace');
        }
        throw memberError;
      }

      // Mark invitation as accepted
      await supabase
        .from('workspace_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Joined workspace');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to join workspace');
    },
  });
}

// Hook for fetching invitation details by token (for preview)
export function useInvitationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) return null;

      // Get the invitation
      const { data: invData, error: invError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invError || !invData) return null;

      // Get workspace details
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('name, icon_emoji, type')
        .eq('id', invData.workspace_id)
        .single();

      // Get inviter profile
      const { data: inviterData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', invData.invited_by)
        .single();

      return {
        ...invData,
        workspace: workspaceData || { name: 'Unknown', icon_emoji: null, type: 'team' },
        inviter_profile: inviterData || { full_name: null, avatar_url: null },
      } as WorkspaceInvitation;
    },
    enabled: !!token,
  });
}
