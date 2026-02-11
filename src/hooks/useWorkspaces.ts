import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  icon_emoji: string | null;
  icon_url: string | null;
  cover_url: string | null;
  type: 'personal' | 'team' | 'company';
  company_id: string | null;
  created_by: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  my_role?: 'owner' | 'admin' | 'editor' | 'member' | 'viewer';
}

export function useWorkspaces() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workspacesQuery = useQuery({
    queryKey: ['workspaces', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch workspaces with member info
      const { data: memberships, error: memberError } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace_id,
          workspaces (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memberError) throw memberError;

      // Get member counts for each workspace
      const workspaceIds = memberships?.map(m => m.workspace_id) || [];
      
      const { data: counts, error: countError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .eq('is_active', true);

      if (countError) throw countError;

      // Count members per workspace
      const memberCounts = (counts || []).reduce((acc, m) => {
        acc[m.workspace_id] = (acc[m.workspace_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (memberships || []).map(m => ({
        ...(m.workspaces as unknown as Workspace),
        my_role: m.role as Workspace['my_role'],
        member_count: memberCounts[m.workspace_id] || 1,
      })) as Workspace[];
    },
    enabled: !!user?.id,
  });

  const personalWorkspace = workspacesQuery.data?.find(w => w.type === 'personal');
  const companyWorkspaces = workspacesQuery.data?.filter(w => w.type === 'company') || [];
  const teamWorkspaces = workspacesQuery.data?.filter(w => w.type === 'team') || [];

  const createWorkspace = useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      icon_emoji?: string;
      type?: 'team' | 'company';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: params.name,
          description: params.description || null,
          icon_emoji: params.icon_emoji || '📁',
          type: params.type || 'team',
          created_by: user.id,
          slug,
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      return workspace as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created');
    },
    onError: (error) => {
      toast.error('Failed to create workspace');
      console.error('Create workspace error:', error);
    },
  });

  const updateWorkspace = useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Partial<Pick<Workspace, 'name' | 'description' | 'icon_emoji' | 'icon_url' | 'cover_url' | 'settings'>>;
    }) => {
      const { data, error } = await supabase
        .from('workspaces')
        .update(params.updates as Record<string, unknown>)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace updated');
    },
    onError: (error) => {
      toast.error('Failed to update workspace');
      console.error('Update workspace error:', error);
    },
  });

  const deleteWorkspace = useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete workspace');
      console.error('Delete workspace error:', error);
    },
  });

  const leaveWorkspace = useMutation({
    mutationFn: async (workspaceId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Left workspace');
    },
    onError: (error) => {
      toast.error('Failed to leave workspace');
      console.error('Leave workspace error:', error);
    },
  });

  return {
    workspaces: workspacesQuery.data || [],
    personalWorkspace,
    companyWorkspaces,
    teamWorkspaces,
    isLoading: workspacesQuery.isLoading,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    leaveWorkspace,
  };
}

export function useWorkspace(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (error) throw error;
      return data as Workspace;
    },
    enabled: !!workspaceId && !!user?.id,
  });
}
