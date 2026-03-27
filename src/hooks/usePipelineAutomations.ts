import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PipelineTriggerType =
  | 'stage_change'
  | 'status_change'
  | 'days_in_stage_exceeded'
  | 'interview_scheduled'
  | 'feedback_added'
  | 'message_sent';

export type PipelineActionType =
  | 'send_email'
  | 'send_notification'
  | 'create_task'
  | 'auto_advance';

export interface PipelineAutomation {
  id: string;
  job_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: PipelineTriggerType;
  trigger_config: Record<string, unknown>;
  action_type: PipelineActionType;
  action_config: Record<string, unknown>;
  last_triggered_at: string | null;
  trigger_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineAutomationLog {
  id: string;
  automation_id: string;
  pipeline_event_id: string | null;
  status: 'success' | 'failed' | 'skipped';
  trigger_data: Record<string, unknown> | null;
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  executed_at: string;
}

export function usePipelineAutomations(jobId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['pipeline-automations', jobId];

  const { data: automations = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await (supabase as ReturnType<typeof supabase.from>)
        .from('pipeline_automations')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PipelineAutomation[];
    },
    enabled: !!jobId,
  });

  const createAutomation = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      trigger_type: PipelineTriggerType;
      trigger_config: Record<string, unknown>;
      action_type: PipelineActionType;
      action_config: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as ReturnType<typeof supabase.from>)
        .from('pipeline_automations')
        .insert({
          job_id: jobId,
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Automation created');
    },
    onError: () => {
      toast.error('Failed to create automation');
    },
  });

  const updateAutomation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineAutomation> & { id: string }) => {
      const { error } = await (supabase as ReturnType<typeof supabase.from>)
        .from('pipeline_automations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as ReturnType<typeof supabase.from>)
        .from('pipeline_automations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Automation deleted');
    },
  });

  const toggleAutomation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as ReturnType<typeof supabase.from>)
        .from('pipeline_automations')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    automations,
    isLoading,
    error,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
  };
}

export function usePipelineAutomationLogs(automationId: string | undefined) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['pipeline-automation-logs', automationId],
    queryFn: async () => {
      if (!automationId) return [];
      const { data, error } = await (supabase as ReturnType<typeof supabase.from>)
        .from('pipeline_automation_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('executed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as PipelineAutomationLog[];
    },
    enabled: !!automationId,
  });

  return { logs, isLoading };
}
