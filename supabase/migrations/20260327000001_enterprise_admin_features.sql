-- ============================================================================
-- Enterprise Admin Features Migration
-- Adds tables for: Custom Roles, Consent Management, ROPA, EEO, Support Tickets,
-- Custom Fields, Job Board Distribution, Report Builder, Background Checks,
-- Workflow Builder, Usage Metering, Integration Marketplace, Session Management,
-- Approval Chains, Announcements, Interview Kits, Notification Center, Webhooks,
-- Status Page, Customer Health Scores
-- ============================================================================

-- ─────────────────────────────────────────────
-- 1. CUSTOM ROLES & GRANULAR PERMISSIONS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  UNIQUE(resource, action)
);

CREATE TABLE IF NOT EXISTS public.custom_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, custom_role_id, company_id)
);

-- Seed core permission definitions
INSERT INTO public.permission_definitions (resource, action, display_name, description, category) VALUES
  ('candidates', 'view', 'View Candidates', 'View candidate profiles and data', 'Talent'),
  ('candidates', 'create', 'Create Candidates', 'Add new candidate profiles', 'Talent'),
  ('candidates', 'edit', 'Edit Candidates', 'Modify candidate information', 'Talent'),
  ('candidates', 'delete', 'Delete Candidates', 'Remove candidate records', 'Talent'),
  ('candidates', 'export', 'Export Candidates', 'Export candidate data', 'Talent'),
  ('jobs', 'view', 'View Jobs', 'View job listings', 'Hiring'),
  ('jobs', 'create', 'Create Jobs', 'Post new job listings', 'Hiring'),
  ('jobs', 'edit', 'Edit Jobs', 'Modify job listings', 'Hiring'),
  ('jobs', 'delete', 'Delete Jobs', 'Remove job listings', 'Hiring'),
  ('jobs', 'approve', 'Approve Jobs', 'Approve job postings', 'Hiring'),
  ('applications', 'view', 'View Applications', 'View job applications', 'Hiring'),
  ('applications', 'manage', 'Manage Applications', 'Move, approve, reject applications', 'Hiring'),
  ('companies', 'view', 'View Companies', 'View company profiles', 'Companies'),
  ('companies', 'create', 'Create Companies', 'Add new companies', 'Companies'),
  ('companies', 'edit', 'Edit Companies', 'Modify company information', 'Companies'),
  ('companies', 'delete', 'Delete Companies', 'Remove company records', 'Companies'),
  ('users', 'view', 'View Users', 'View user accounts', 'Admin'),
  ('users', 'manage', 'Manage Users', 'Create/modify user accounts', 'Admin'),
  ('users', 'roles', 'Manage Roles', 'Assign and revoke roles', 'Admin'),
  ('users', 'impersonate', 'Impersonate Users', 'Log in as another user', 'Admin'),
  ('finance', 'view', 'View Finance', 'View financial dashboards', 'Finance'),
  ('finance', 'manage', 'Manage Finance', 'Edit financial records', 'Finance'),
  ('finance', 'invoices', 'Manage Invoices', 'Create and send invoices', 'Finance'),
  ('reports', 'view', 'View Reports', 'Access reporting dashboards', 'Analytics'),
  ('reports', 'create', 'Create Reports', 'Build custom reports', 'Analytics'),
  ('reports', 'export', 'Export Reports', 'Export report data', 'Analytics'),
  ('settings', 'view', 'View Settings', 'View system settings', 'System'),
  ('settings', 'manage', 'Manage Settings', 'Modify system settings', 'System'),
  ('security', 'view', 'View Security', 'View security dashboards', 'Security'),
  ('security', 'manage', 'Manage Security', 'Modify security settings', 'Security'),
  ('integrations', 'view', 'View Integrations', 'View integration status', 'Integrations'),
  ('integrations', 'manage', 'Manage Integrations', 'Configure integrations', 'Integrations'),
  ('assessments', 'view', 'View Assessments', 'View assessment results', 'Assessments'),
  ('assessments', 'manage', 'Manage Assessments', 'Configure assessment games', 'Assessments'),
  ('interviews', 'view', 'View Interviews', 'View interview schedules', 'Hiring'),
  ('interviews', 'manage', 'Manage Interviews', 'Schedule and configure interviews', 'Hiring'),
  ('offers', 'view', 'View Offers', 'View offer details', 'Hiring'),
  ('offers', 'create', 'Create Offers', 'Generate new offers', 'Hiring'),
  ('offers', 'approve', 'Approve Offers', 'Approve offer letters', 'Hiring')
ON CONFLICT (resource, action) DO NOTHING;

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom roles" ON public.custom_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "All authenticated can view permissions" ON public.permission_definitions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage role assignments" ON public.custom_role_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 2. CONSENT MANAGEMENT
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL DEFAULT 'consent',
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  source TEXT DEFAULT 'platform',
  ip_address INET,
  user_agent TEXT,
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consent_records_user ON public.consent_records(user_id);
CREATE INDEX idx_consent_records_type ON public.consent_records(consent_type);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own consent" ON public.consent_records
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage consent" ON public.consent_records
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 3. RECORD OF PROCESSING ACTIVITIES (ROPA)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL,
  description TEXT,
  data_categories TEXT[] DEFAULT '{}',
  data_subject_categories TEXT[] DEFAULT '{}',
  processing_purposes TEXT[] DEFAULT '{}',
  legal_basis TEXT NOT NULL,
  retention_period TEXT,
  retention_days INTEGER,
  recipients TEXT[] DEFAULT '{}',
  third_country_transfers TEXT[] DEFAULT '{}',
  safeguards TEXT,
  technical_measures TEXT[] DEFAULT '{}',
  organizational_measures TEXT[] DEFAULT '{}',
  dpia_required BOOLEAN DEFAULT false,
  dpia_completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'archived')),
  responsible_person TEXT,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ROPA" ON public.processing_activities
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 4. EEO / OFCCP COMPLIANCE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eeo_self_identifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  application_id UUID,
  gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say', 'other')),
  race_ethnicity TEXT CHECK (race_ethnicity IN (
    'american_indian_alaska_native', 'asian', 'black_african_american',
    'hispanic_latino', 'native_hawaiian_pacific_islander', 'white',
    'two_or_more', 'prefer_not_to_say'
  )),
  veteran_status TEXT CHECK (veteran_status IN ('veteran', 'not_veteran', 'prefer_not_to_say')),
  disability_status TEXT CHECK (disability_status IN ('yes', 'no', 'prefer_not_to_say')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.eeo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('eeo1', 'adverse_impact', 'diversity_pipeline', 'ofccp_audit')),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  report_data JSONB NOT NULL DEFAULT '{}',
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'submitted', 'archived'))
);

ALTER TABLE public.eeo_self_identifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eeo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users submit own EEO" ON public.eeo_self_identifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view EEO aggregate" ON public.eeo_self_identifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage EEO reports" ON public.eeo_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 5. ADMIN SUPPORT TICKET MANAGEMENT
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_ticket_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  responder_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_sla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL UNIQUE CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  first_response_hours INTEGER NOT NULL,
  resolution_hours INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.support_ticket_sla (priority, first_response_hours, resolution_hours) VALUES
  ('critical', 1, 4),
  ('high', 4, 24),
  ('medium', 8, 72),
  ('low', 24, 168)
ON CONFLICT (priority) DO NOTHING;

ALTER TABLE public.support_ticket_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_sla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ticket assignments" ON public.support_ticket_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage ticket responses" ON public.support_ticket_responses
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = responder_id);
CREATE POLICY "All view SLA" ON public.support_ticket_sla
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- 6. CUSTOM FIELDS (CONFIGURABLE DATA MODEL)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('candidate', 'job', 'company', 'application')),
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'textarea', 'number', 'date', 'boolean', 'select', 'multiselect',
    'email', 'url', 'phone', 'currency', 'percentage', 'file'
  )),
  options JSONB DEFAULT '[]',
  is_required BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT true,
  is_visible_in_list BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  section TEXT DEFAULT 'Custom Fields',
  placeholder TEXT,
  help_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  visible_to_roles TEXT[] DEFAULT '{admin}',
  editable_by_roles TEXT[] DEFAULT '{admin}',
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, field_name, company_id)
);

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(field_definition_id, entity_id)
);

CREATE INDEX idx_custom_field_values_entity ON public.custom_field_values(entity_id);
CREATE INDEX idx_custom_field_definitions_entity ON public.custom_field_definitions(entity_type);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom fields" ON public.custom_field_definitions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authed users view custom field values" ON public.custom_field_values
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage custom field values" ON public.custom_field_values
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 7. JOB BOARD DISTRIBUTION
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_board_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_name TEXT NOT NULL,
  board_type TEXT NOT NULL CHECK (board_type IN ('indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'monster', 'careerbuilder', 'custom_xml', 'custom_api')),
  api_credentials JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  posting_defaults JSONB DEFAULT '{}',
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_board_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  board_connection_id UUID NOT NULL REFERENCES public.job_board_connections(id) ON DELETE CASCADE,
  external_posting_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'expired', 'removed', 'failed')),
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  applications_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  cost_per_click NUMERIC(10,2),
  total_spend NUMERIC(10,2) DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.job_board_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_board_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage job boards" ON public.job_board_connections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage postings" ON public.job_board_postings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 8. CUSTOM REPORT BUILDER
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT DEFAULT 'custom',
  entity_type TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '[]',
  group_by TEXT[],
  sort_by JSONB DEFAULT '{}',
  chart_type TEXT,
  schedule_cron TEXT,
  schedule_recipients TEXT[],
  schedule_enabled BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  is_shared BOOLEAN DEFAULT false,
  shared_with_roles TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.saved_reports(id) ON DELETE CASCADE,
  executed_by UUID REFERENCES auth.users(id),
  row_count INTEGER,
  execution_time_ms INTEGER,
  result_url TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own and shared reports" ON public.saved_reports
  FOR SELECT USING (auth.uid() = created_by OR is_shared = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own reports" ON public.saved_reports
  FOR ALL USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users see own executions" ON public.report_executions
  FOR SELECT USING (auth.uid() = executed_by OR public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 9. BACKGROUND CHECK INTEGRATION
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.background_check_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL CHECK (provider_name IN ('checkr', 'sterling', 'hireright', 'goodhire', 'certn')),
  api_key_encrypted TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  default_package TEXT,
  config JSONB DEFAULT '{}',
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  application_id UUID,
  provider_id UUID NOT NULL REFERENCES public.background_check_providers(id),
  external_check_id TEXT,
  package_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'initiated', 'in_progress', 'complete', 'suspended', 'canceled', 'failed'
  )),
  result TEXT CHECK (result IN ('clear', 'consider', 'adverse_action', NULL)),
  result_details JSONB DEFAULT '{}',
  report_url TEXT,
  estimated_completion TIMESTAMPTZ,
  initiated_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.background_check_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bg providers" ON public.background_check_providers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage bg checks" ON public.background_checks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 10. VISUAL WORKFLOW BUILDER
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recruiting_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('application', 'candidate', 'job', 'interview', 'offer')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('stage_change', 'field_change', 'time_based', 'manual', 'event')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.companies(id),
  department TEXT,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.recruiting_workflows(id) ON DELETE CASCADE,
  trigger_entity_id UUID,
  trigger_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  actions_completed JSONB DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.recruiting_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage workflows" ON public.recruiting_workflows
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view executions" ON public.workflow_executions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 11. USAGE METERING ENGINE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'count',
  description TEXT
);

INSERT INTO public.usage_meters (meter_name, display_name, unit) VALUES
  ('ai_api_calls', 'AI API Calls', 'calls'),
  ('resume_parses', 'Resume Parses', 'parses'),
  ('candidate_enrichments', 'Candidate Enrichments', 'enrichments'),
  ('job_postings', 'Job Postings', 'postings'),
  ('active_users', 'Active Users', 'users'),
  ('email_sends', 'Email Sends', 'emails'),
  ('background_checks', 'Background Checks', 'checks'),
  ('report_exports', 'Report Exports', 'exports'),
  ('storage_mb', 'Storage Used', 'MB'),
  ('api_calls', 'API Calls', 'calls')
ON CONFLICT (meter_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  user_id UUID REFERENCES auth.users(id),
  meter_name TEXT NOT NULL REFERENCES public.usage_meters(meter_name),
  quantity NUMERIC(12,2) DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  meter_name TEXT NOT NULL REFERENCES public.usage_meters(meter_name),
  monthly_limit NUMERIC(12,2),
  overage_rate NUMERIC(10,4),
  overage_enabled BOOLEAN DEFAULT false,
  alert_threshold_percent INTEGER DEFAULT 80,
  UNIQUE(company_id, meter_name)
);

CREATE TABLE IF NOT EXISTS public.usage_monthly_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  meter_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_usage NUMERIC(12,2) DEFAULT 0,
  monthly_limit NUMERIC(12,2),
  overage_amount NUMERIC(12,2) DEFAULT 0,
  UNIQUE(company_id, meter_name, period_start)
);

CREATE INDEX idx_usage_events_company ON public.usage_events(company_id, recorded_at);
CREATE INDEX idx_usage_events_meter ON public.usage_events(meter_name, recorded_at);

ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_monthly_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all meters" ON public.usage_meters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage usage events" ON public.usage_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage usage limits" ON public.usage_limits FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view aggregates" ON public.usage_monthly_aggregates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 12. INTEGRATION MARKETPLACE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.integration_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'ats', 'hris', 'job_boards', 'background_checks', 'communication',
    'calendar', 'assessment', 'analytics', 'accounting', 'productivity', 'custom'
  )),
  logo_url TEXT,
  website_url TEXT,
  auth_type TEXT CHECK (auth_type IN ('oauth2', 'api_key', 'basic', 'webhook')),
  config_schema JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  documentation_url TEXT,
  setup_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.integration_catalog(id),
  company_id UUID REFERENCES public.companies(id),
  config JSONB DEFAULT '{}',
  credentials_encrypted JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'configured' CHECK (status IN ('configured', 'connected', 'error', 'disconnected')),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  installed_by UUID REFERENCES auth.users(id),
  installed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(catalog_id, company_id)
);

INSERT INTO public.integration_catalog (slug, name, description, category, auth_type, is_available) VALUES
  ('greenhouse', 'Greenhouse', 'Sync candidates, jobs, and applications with Greenhouse ATS', 'ats', 'api_key', true),
  ('lever', 'Lever', 'Import and sync hiring data with Lever', 'ats', 'oauth2', true),
  ('workday', 'Workday', 'Sync employee and candidate data with Workday', 'hris', 'oauth2', false),
  ('bamboohr', 'BambooHR', 'HRIS integration for employee data sync', 'hris', 'api_key', false),
  ('personio', 'Personio', 'European HRIS integration', 'hris', 'oauth2', false),
  ('indeed', 'Indeed', 'Post jobs and receive applications from Indeed', 'job_boards', 'api_key', true),
  ('linkedin_jobs', 'LinkedIn Jobs', 'Distribute job postings to LinkedIn', 'job_boards', 'oauth2', true),
  ('glassdoor', 'Glassdoor', 'Post jobs to Glassdoor', 'job_boards', 'api_key', false),
  ('checkr', 'Checkr', 'Run background checks on candidates', 'background_checks', 'api_key', true),
  ('sterling', 'Sterling', 'Enterprise background screening', 'background_checks', 'api_key', false),
  ('slack', 'Slack', 'Send hiring notifications to Slack channels', 'communication', 'oauth2', true),
  ('teams', 'Microsoft Teams', 'Integrate with Microsoft Teams for notifications', 'communication', 'oauth2', false),
  ('google_calendar', 'Google Calendar', 'Sync interview schedules', 'calendar', 'oauth2', true),
  ('outlook_calendar', 'Outlook Calendar', 'Sync with Microsoft Outlook calendar', 'calendar', 'oauth2', false),
  ('moneybird', 'Moneybird', 'Dutch accounting integration', 'accounting', 'oauth2', true),
  ('xero', 'Xero', 'Accounting and invoicing integration', 'accounting', 'oauth2', false),
  ('zapier', 'Zapier', 'Connect with 5000+ apps via Zapier', 'productivity', 'api_key', true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.integration_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All view catalog" ON public.integration_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage installations" ON public.integration_installations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 13. SESSION MANAGEMENT
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE,
  max_concurrent_sessions INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 480,
  require_mfa BOOLEAN DEFAULT false,
  mfa_grace_period_hours INTEGER DEFAULT 72,
  ip_whitelist_enabled BOOLEAN DEFAULT false,
  allowed_countries TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.session_policies (role, max_concurrent_sessions, session_timeout_minutes, require_mfa) VALUES
  ('admin', 3, 240, true),
  ('strategist', 5, 480, true),
  ('partner', 5, 480, false),
  ('user', 10, 720, false)
ON CONFLICT (role) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.active_sessions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  city TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  terminated_by UUID REFERENCES auth.users(id),
  termination_reason TEXT
);

CREATE INDEX idx_sessions_user ON public.active_sessions_log(user_id, terminated_at);

ALTER TABLE public.session_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage session policies" ON public.session_policies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users see own sessions" ON public.active_sessions_log
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sessions" ON public.active_sessions_log
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 14. APPROVAL CHAINS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.approval_chain_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('offer', 'job_posting', 'expense', 'data_deletion', 'role_change', 'custom')),
  conditions JSONB NOT NULL DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES public.approval_chain_definitions(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  request_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.approval_step_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comment TEXT,
  decided_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_chain_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_step_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval chains" ON public.approval_chain_definitions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Involved users see requests" ON public.approval_requests
  FOR SELECT USING (auth.uid() = requested_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage requests" ON public.approval_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Approvers respond" ON public.approval_step_responses
  FOR ALL USING (auth.uid() = approver_id OR public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 15. ANNOUNCEMENTS / BROADCAST SYSTEM
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  display_type TEXT DEFAULT 'banner' CHECK (display_type IN ('banner', 'modal', 'toast', 'page')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  target_roles TEXT[] DEFAULT '{}',
  target_company_ids UUID[],
  is_dismissible BOOLEAN DEFAULT true,
  requires_acknowledgment BOOLEAN DEFAULT false,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.admin_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All view active announcements" ON public.admin_announcements
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
CREATE POLICY "Admins manage announcements" ON public.admin_announcements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own acknowledgments" ON public.announcement_acknowledgments
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 16. STRUCTURED INTERVIEW KITS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.interview_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  job_id UUID,
  department TEXT,
  interview_stage TEXT,
  duration_minutes INTEGER DEFAULT 60,
  questions JSONB NOT NULL DEFAULT '[]',
  scoring_rubric JSONB DEFAULT '{}',
  anti_bias_prompts TEXT[],
  interviewer_guidelines TEXT,
  debrief_template JSONB DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interview_kit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.interview_kits(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES auth.users(id),
  focus_areas TEXT[],
  specific_questions JSONB DEFAULT '[]',
  assigned_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interview_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_kit_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage interview kits" ON public.interview_kits
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Assigned users view kits" ON public.interview_kit_assignments
  FOR SELECT USING (auth.uid() = interviewer_id OR public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 17. PLATFORM WEBHOOK EVENTS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  payload_schema JSONB DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  endpoint_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.platform_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  next_retry_at TIMESTAMPTZ
);

INSERT INTO public.platform_webhook_events (event_type, display_name, description, category) VALUES
  ('candidate.created', 'Candidate Created', 'Fired when a new candidate is added', 'Candidates'),
  ('candidate.updated', 'Candidate Updated', 'Fired when candidate data changes', 'Candidates'),
  ('candidate.deleted', 'Candidate Deleted', 'Fired when a candidate is removed', 'Candidates'),
  ('application.created', 'Application Created', 'Fired when a new application is submitted', 'Applications'),
  ('application.stage_changed', 'Application Stage Changed', 'Fired when an application moves stages', 'Applications'),
  ('application.rejected', 'Application Rejected', 'Fired when an application is rejected', 'Applications'),
  ('application.hired', 'Application Hired', 'Fired when a candidate is marked as hired', 'Applications'),
  ('job.created', 'Job Created', 'Fired when a new job is posted', 'Jobs'),
  ('job.updated', 'Job Updated', 'Fired when a job is modified', 'Jobs'),
  ('job.closed', 'Job Closed', 'Fired when a job is closed', 'Jobs'),
  ('interview.scheduled', 'Interview Scheduled', 'Fired when an interview is scheduled', 'Interviews'),
  ('interview.completed', 'Interview Completed', 'Fired when interview feedback is submitted', 'Interviews'),
  ('offer.created', 'Offer Created', 'Fired when an offer is generated', 'Offers'),
  ('offer.accepted', 'Offer Accepted', 'Fired when a candidate accepts an offer', 'Offers'),
  ('offer.declined', 'Offer Declined', 'Fired when a candidate declines an offer', 'Offers'),
  ('user.created', 'User Created', 'Fired when a new user account is created', 'Users'),
  ('user.role_changed', 'User Role Changed', 'Fired when a user role is modified', 'Users')
ON CONFLICT (event_type) DO NOTHING;

ALTER TABLE public.platform_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All view webhook events" ON public.platform_webhook_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage subscriptions" ON public.platform_webhook_subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view deliveries" ON public.platform_webhook_deliveries
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 18. STATUS PAGE / INCIDENTS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.status_page_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.status_page_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('none', 'minor', 'major', 'critical')),
  status TEXT DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'postmortem')),
  components UUID[],
  started_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.status_page_incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.status_page_incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduled_maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  components UUID[],
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.status_page_components (name, description, display_order) VALUES
  ('Web Application', 'Main web platform', 1),
  ('API', 'REST API endpoints', 2),
  ('AI Features', 'AI-powered features (matching, chat, enrichment)', 3),
  ('Email Service', 'Transactional and campaign emails', 4),
  ('File Storage', 'Document and media storage', 5),
  ('Real-time Features', 'Live updates, WebSocket connections', 6),
  ('Integrations', 'Third-party integrations (Greenhouse, Moneybird, etc.)', 7),
  ('Authentication', 'Login, SSO, and MFA services', 8)
ON CONFLICT DO NOTHING;

ALTER TABLE public.status_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_page_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_page_incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_maintenances ENABLE ROW LEVEL SECURITY;

-- Status page is PUBLIC (no auth required for SELECT)
CREATE POLICY "Public view components" ON public.status_page_components FOR SELECT USING (true);
CREATE POLICY "Admins manage components" ON public.status_page_components FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public view incidents" ON public.status_page_incidents FOR SELECT USING (true);
CREATE POLICY "Admins manage incidents" ON public.status_page_incidents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public view updates" ON public.status_page_incident_updates FOR SELECT USING (true);
CREATE POLICY "Admins manage updates" ON public.status_page_incident_updates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public view maintenance" ON public.scheduled_maintenances FOR SELECT USING (true);
CREATE POLICY "Admins manage maintenance" ON public.scheduled_maintenances FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 19. CUSTOMER HEALTH SCORES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  usage_score INTEGER CHECK (usage_score BETWEEN 0 AND 100),
  adoption_score INTEGER CHECK (adoption_score BETWEEN 0 AND 100),
  support_score INTEGER CHECK (support_score BETWEEN 0 AND 100),
  nps_score INTEGER,
  risk_level TEXT DEFAULT 'healthy' CHECK (risk_level IN ('healthy', 'monitor', 'at_risk', 'critical')),
  contract_renewal_date DATE,
  monthly_recurring_revenue NUMERIC(12,2),
  active_users_count INTEGER,
  dau_mau_ratio NUMERIC(5,2),
  features_adopted TEXT[],
  last_login_at TIMESTAMPTZ,
  support_tickets_open INTEGER DEFAULT 0,
  csm_notes TEXT,
  csm_owner UUID REFERENCES auth.users(id),
  scored_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.customer_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage health scores" ON public.customer_health_scores
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────
-- 20. NOTIFICATION CENTER CONFIGURATION
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "push": false, "slack": false}',
  target_roles TEXT[] DEFAULT '{}',
  template_subject TEXT,
  template_body TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'action')),
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.in_app_notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notification rules" ON public.notification_rules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users see own notifications" ON public.in_app_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notifications" ON public.in_app_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 21. EMPLOYEE ONBOARDING POST-HIRE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  checklist_items JSONB NOT NULL DEFAULT '[]',
  documents_required TEXT[] DEFAULT '{}',
  duration_days INTEGER DEFAULT 90,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  template_id UUID REFERENCES public.onboarding_templates(id),
  application_id UUID,
  hire_date DATE NOT NULL,
  start_date DATE,
  buddy_id UUID REFERENCES auth.users(id),
  manager_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  checklist_progress JSONB DEFAULT '{}',
  documents_submitted JSONB DEFAULT '{}',
  check_in_30_date DATE,
  check_in_60_date DATE,
  check_in_90_date DATE,
  check_in_30_completed BOOLEAN DEFAULT false,
  check_in_60_completed BOOLEAN DEFAULT false,
  check_in_90_completed BOOLEAN DEFAULT false,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboardings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage onboarding templates" ON public.onboarding_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage onboardings" ON public.employee_onboardings
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = employee_id);
