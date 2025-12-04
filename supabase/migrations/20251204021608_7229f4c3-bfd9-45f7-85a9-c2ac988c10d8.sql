-- Create stealth viewer audit logs table
CREATE TABLE public.stealth_viewer_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_title TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('viewer_added', 'viewer_removed', 'stealth_enabled', 'stealth_disabled', 'bulk_add', 'bulk_remove')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_email TEXT,
  target_user_name TEXT,
  performed_by UUID NOT NULL,
  performed_by_email TEXT,
  performed_by_name TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_stealth_audit_job ON public.stealth_viewer_audit_logs(job_id);
CREATE INDEX idx_stealth_audit_target ON public.stealth_viewer_audit_logs(target_user_id);
CREATE INDEX idx_stealth_audit_performer ON public.stealth_viewer_audit_logs(performed_by);
CREATE INDEX idx_stealth_audit_created ON public.stealth_viewer_audit_logs(created_at DESC);
CREATE INDEX idx_stealth_audit_action ON public.stealth_viewer_audit_logs(action_type);

-- Enable RLS
ALTER TABLE public.stealth_viewer_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins/strategists can view all audit logs
CREATE POLICY "Admins and strategists can view all stealth audit logs"
ON public.stealth_viewer_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- Partners can view audit logs for their company's jobs
CREATE POLICY "Partners can view audit logs for their company jobs"
ON public.stealth_viewer_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.profiles p ON p.company_id = j.company_id
    WHERE j.id = stealth_viewer_audit_logs.job_id
    AND p.id = auth.uid()
  )
);

-- Anyone authenticated can insert audit logs (service will handle authorization)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.stealth_viewer_audit_logs FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());