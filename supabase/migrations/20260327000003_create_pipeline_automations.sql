-- Pipeline automations: trigger-action rules for ATS pipeline events
CREATE TABLE IF NOT EXISTS public.pipeline_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'stage_change', 'status_change', 'days_in_stage_exceeded',
    'interview_scheduled', 'feedback_added', 'message_sent'
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_email', 'send_notification', 'create_task', 'auto_advance'
  )),
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_automations_job ON public.pipeline_automations(job_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_automations_active ON public.pipeline_automations(job_id, is_active) WHERE is_active = true;

-- Execution logs
CREATE TABLE IF NOT EXISTS public.pipeline_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.pipeline_automations(id) ON DELETE CASCADE,
  pipeline_event_id UUID REFERENCES public.pipeline_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  trigger_data JSONB,
  result_data JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_automation_logs_automation ON public.pipeline_automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_automation_logs_time ON public.pipeline_automation_logs(executed_at DESC);

-- RLS
ALTER TABLE public.pipeline_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_automation_logs ENABLE ROW LEVEL SECURITY;

-- Automations: viewable/editable by company members of the job's company
CREATE POLICY "Company members can manage pipeline automations"
  ON public.pipeline_automations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.company_members cm ON cm.company_id = j.company_id
      WHERE j.id = pipeline_automations.job_id
      AND cm.user_id = auth.uid()
    )
  );

-- Logs: viewable by company members
CREATE POLICY "Company members can view automation logs"
  ON public.pipeline_automation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pipeline_automations pa
      JOIN public.jobs j ON j.id = pa.job_id
      JOIN public.company_members cm ON cm.company_id = j.company_id
      WHERE pa.id = pipeline_automation_logs.automation_id
      AND cm.user_id = auth.uid()
    )
  );

-- Allow service role to insert logs (from edge function)
CREATE POLICY "Service role can insert automation logs"
  ON public.pipeline_automation_logs FOR INSERT
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE TRIGGER update_pipeline_automations_updated_at
  BEFORE UPDATE ON public.pipeline_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
