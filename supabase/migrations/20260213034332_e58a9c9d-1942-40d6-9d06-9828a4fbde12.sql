
-- Sourcing Missions table for tracking external candidate discovery
CREATE TABLE public.sourcing_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  search_criteria JSONB,
  search_radius TEXT DEFAULT 'balanced',
  profiles_found INT DEFAULT 0,
  profiles_new INT DEFAULT 0,
  profiles_ranked INT DEFAULT 0,
  cost_credits_used NUMERIC DEFAULT 0,
  results JSONB,
  error TEXT,
  triggered_by TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.sourcing_missions ENABLE ROW LEVEL SECURITY;

-- Admin/strategist can manage sourcing missions
CREATE POLICY "Admins can manage sourcing missions"
  ON public.sourcing_missions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Index for fast lookups
CREATE INDEX idx_sourcing_missions_job_id ON public.sourcing_missions(job_id);
CREATE INDEX idx_sourcing_missions_status ON public.sourcing_missions(status);
