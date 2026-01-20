-- Create workspace automations table
CREATE TABLE public.workspace_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  database_id UUID REFERENCES public.workspace_databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('row_created', 'row_updated', 'row_deleted', 'field_changed', 'scheduled')),
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN ('send_notification', 'update_field', 'create_page', 'call_webhook', 'send_email')),
  action_config JSONB DEFAULT '{}',
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create automation logs table for tracking execution
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.workspace_automations(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  trigger_data JSONB,
  result_data JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_automations
CREATE POLICY "Users can view automations in their workspaces"
ON public.workspace_automations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_automations.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create automations in their workspaces"
ON public.workspace_automations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_automations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'editor')
  )
);

CREATE POLICY "Users can update automations in their workspaces"
ON public.workspace_automations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_automations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'editor')
  )
);

CREATE POLICY "Users can delete automations in their workspaces"
ON public.workspace_automations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_automations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- RLS policies for automation_logs
CREATE POLICY "Users can view automation logs in their workspaces"
ON public.automation_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_automations wa
    JOIN public.workspace_members wm ON wm.workspace_id = wa.workspace_id
    WHERE wa.id = automation_logs.automation_id
    AND wm.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_workspace_automations_workspace ON public.workspace_automations(workspace_id);
CREATE INDEX idx_workspace_automations_database ON public.workspace_automations(database_id);
CREATE INDEX idx_automation_logs_automation ON public.automation_logs(automation_id);
CREATE INDEX idx_automation_logs_executed ON public.automation_logs(executed_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_workspace_automations_updated_at
  BEFORE UPDATE ON public.workspace_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();