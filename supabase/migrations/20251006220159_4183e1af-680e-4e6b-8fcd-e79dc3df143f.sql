-- Add audit logging for pipeline changes
CREATE TABLE IF NOT EXISTS public.pipeline_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'stage_added', 'stage_removed', 'stage_updated', 'stage_reordered'
  stage_data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pipeline_audit_logs ENABLE ROW LEVEL SECURITY;

-- Company members can view audit logs for their jobs
CREATE POLICY "Company members can view pipeline audit logs"
ON public.pipeline_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = pipeline_audit_logs.job_id
    AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'))
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert pipeline audit logs"
ON public.pipeline_audit_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_pipeline_audit_logs_job_id ON public.pipeline_audit_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_audit_logs_created_at ON public.pipeline_audit_logs(created_at DESC);