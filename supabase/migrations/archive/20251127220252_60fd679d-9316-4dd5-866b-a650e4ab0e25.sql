-- Clean up test table
DROP TABLE IF EXISTS public.test_partner_table;

-- Partner Permissions
CREATE TABLE IF NOT EXISTS public.partner_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company Role Permissions
CREATE TABLE IF NOT EXISTS public.company_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  role TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_company_role_permissions_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_company_role_permissions_permission FOREIGN KEY (permission_name) REFERENCES public.partner_permissions(name) ON DELETE CASCADE,
  CONSTRAINT unique_company_role_permission UNIQUE(company_id, role, permission_name)
);

-- Partner Audit Log
CREATE TABLE IF NOT EXISTS public.partner_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_partner_audit_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_partner_audit_actor FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_partner_audit_company ON public.partner_audit_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_audit_actor ON public.partner_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_audit_resource ON public.partner_audit_log(resource_type, resource_id);

-- Partner Analytics Snapshots
CREATE TABLE IF NOT EXISTS public.partner_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  total_applications INT NOT NULL DEFAULT 0,
  active_candidates INT NOT NULL DEFAULT 0,
  interviews_scheduled INT NOT NULL DEFAULT 0,
  offers_sent INT NOT NULL DEFAULT 0,
  hires_made INT NOT NULL DEFAULT 0,
  avg_time_to_hire_days NUMERIC(10,2),
  avg_time_to_interview_days NUMERIC(10,2),
  offer_acceptance_rate NUMERIC(5,2),
  source_breakdown JSONB DEFAULT '{}',
  stage_distribution JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_analytics_snapshots_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT unique_company_snapshot_date UNIQUE(company_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_company_date ON public.partner_analytics_snapshots(company_id, snapshot_date DESC);

-- Insert default permissions
INSERT INTO public.partner_permissions (name, description, category) VALUES
  ('view_candidates', 'View candidate profiles and applications', 'candidates'),
  ('move_pipeline', 'Move candidates through pipeline stages', 'candidates'),
  ('view_salary', 'View candidate salary information', 'candidates'),
  ('export_data', 'Export candidate and analytics data', 'candidates'),
  ('manage_team', 'Invite and manage team members', 'team'),
  ('manage_jobs', 'Create and edit job postings', 'jobs'),
  ('view_analytics', 'View company analytics and reports', 'analytics'),
  ('manage_billing', 'View and manage billing and invoices', 'billing'),
  ('manage_integrations', 'Configure ATS and calendar integrations', 'integrations'),
  ('schedule_interviews', 'Schedule and manage interviews', 'candidates'),
  ('send_offers', 'Create and send offer letters', 'candidates'),
  ('view_audit_log', 'View audit trail of all actions', 'team')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.partner_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view permissions"
  ON public.partner_permissions FOR SELECT
  USING (true);

CREATE POLICY "Company members can view role permissions"
  ON public.company_role_permissions FOR SELECT
  USING (is_company_member(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company admins can manage role permissions"
  ON public.company_role_permissions FOR ALL
  USING (has_company_role(auth.uid(), company_id, 'owner') OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company members can view audit log"
  ON public.partner_audit_log FOR SELECT
  USING (is_company_member(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit log"
  ON public.partner_audit_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Company members can view analytics"
  ON public.partner_analytics_snapshots FOR SELECT
  USING (is_company_member(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert analytics"
  ON public.partner_analytics_snapshots FOR INSERT
  WITH CHECK (true);