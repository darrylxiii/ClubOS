import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export type TriggerType = 'row_created' | 'row_updated' | 'row_deleted' | 'field_changed' | 'scheduled';
export type ActionType = 'send_notification' | 'update_field' | 'create_page' | 'call_webhook' | 'send_email';

export interface WorkspaceAutomation {
  id: string;
  workspace_id: string;
  database_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  last_triggered_at: string | null;
  trigger_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  status: 'success' | 'failed' | 'skipped';
  trigger_data: Record<string, unknown> | null;
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  executed_at: string;
}

export function useWorkspaceAutomations(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: automations, isLoading, error } = useQuery({
    queryKey: ['workspace-automations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('workspace_automations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkspaceAutomation[];
    },
    enabled: !!workspaceId,
  });

  const createAutomation = useMutation({
    mutationFn: async (automation: {
      workspace_id: string;
      database_id: string | null;
      name: string;
      description: string | null;
      is_active: boolean;
      trigger_type: TriggerType;
      trigger_config: Json;
      action_type: ActionType;
      action_config: Json;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('workspace_automations')
        .insert({
          workspace_id: automation.workspace_id,
          database_id: automation.database_id,
          name: automation.name,
          description: automation.description,
          is_active: automation.is_active,
          trigger_type: automation.trigger_type,
          trigger_config: automation.trigger_config,
          action_type: automation.action_type,
          action_config: automation.action_config,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-automations', workspaceId] });
      toast.success('Automation created');
    },
    onError: (error) => {
      toast.error('Failed to create automation: ' + error.message);
    },
  });

  const updateAutomation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      description: string | null;
      is_active: boolean;
      trigger_type: string;
      trigger_config: Json;
      action_type: string;
      action_config: Json;
    }>) => {
      const { data, error } = await supabase
        .from('workspace_automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-automations', workspaceId] });
      toast.success('Automation updated');
    },
    onError: (error) => {
      toast.error('Failed to update automation: ' + error.message);
    },
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-automations', workspaceId] });
      toast.success('Automation deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete automation: ' + error.message);
    },
  });

  const toggleAutomation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('workspace_automations')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceAutomation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-automations', workspaceId] });
      toast.success(data.is_active ? 'Automation enabled' : 'Automation disabled');
    },
    onError: (error) => {
      toast.error('Failed to toggle automation: ' + error.message);
    },
  });

  return {
    automations: automations || [],
    isLoading,
    error,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
  };
}

export function useAutomationLogs(automationId: string | undefined) {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['automation-logs', automationId],
    queryFn: async () => {
      if (!automationId) return [];
      
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!automationId,
  });

  return {
    logs: logs || [],
    isLoading,
    error,
  };
}
