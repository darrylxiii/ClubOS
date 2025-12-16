import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type WorkflowRow = Database['public']['Tables']['communication_workflows']['Row'];
type WorkflowInsert = Database['public']['Tables']['communication_workflows']['Insert'];
type ExecutionRow = Database['public']['Tables']['workflow_executions']['Row'];

export function useCommunicationWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('communication_workflows')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (err: any) {
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async (workflowId?: string) => {
    try {
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExecutions(data || []);
    } catch (err: any) {
      console.error('Error fetching executions:', err);
    }
  }, []);

  const createWorkflow = useCallback(async (workflow: Omit<WorkflowInsert, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('communication_workflows')
        .insert({
          ...workflow,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      await fetchWorkflows();
      
      toast({ title: 'Workflow created', description: `"${workflow.name}" is now active` });
      return data;
    } catch (err: any) {
      toast({ title: 'Failed to create workflow', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [fetchWorkflows, toast]);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<WorkflowRow>) => {
    try {
      const { error } = await supabase
        .from('communication_workflows')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchWorkflows();
      
      toast({ title: 'Workflow updated' });
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    }
  }, [fetchWorkflows, toast]);

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('communication_workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWorkflows();
      
      toast({ title: 'Workflow deleted' });
    } catch (err: any) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    }
  }, [fetchWorkflows, toast]);

  const toggleWorkflow = useCallback(async (id: string, isActive: boolean) => {
    await updateWorkflow(id, { is_active: isActive });
  }, [updateWorkflow]);

  const executeWorkflow = useCallback(async (workflowId: string, entityType: string, entityId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('orchestrate-communication-workflow', {
        body: { workflow_id: workflowId, entity_type: entityType, entity_id: entityId }
      });

      if (error) throw error;
      await fetchExecutions(workflowId);
      
      toast({ title: 'Workflow executed', description: 'Actions have been triggered' });
      return data;
    } catch (err: any) {
      toast({ title: 'Execution failed', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [fetchExecutions, toast]);

  useEffect(() => {
    fetchWorkflows();
    fetchExecutions();
  }, [fetchWorkflows, fetchExecutions]);

  return {
    workflows,
    executions,
    loading,
    refetch: fetchWorkflows,
    refetchExecutions: fetchExecutions,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    executeWorkflow
  };
}
