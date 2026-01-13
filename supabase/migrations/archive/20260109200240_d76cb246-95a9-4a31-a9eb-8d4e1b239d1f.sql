-- Phase 7.1: Audit Trail System
-- Phase 4.1: Executive Dashboard Preferences
-- Phase 5.1: Automated Reporting Infrastructure

-- ============================================
-- KPI ACCESS LOG (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'export', 'configure', 'refresh', 'pin', 'unpin', 'alert_config', 'drill_down')),
  kpi_name TEXT,
  domain TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_kpi_access_log_user ON public.kpi_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_access_log_kpi ON public.kpi_access_log(kpi_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_access_log_action ON public.kpi_access_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_access_log_domain ON public.kpi_access_log(domain, created_at DESC);

-- ============================================
-- EXECUTIVE PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_executive_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_layout JSONB DEFAULT '{"vitals": ["revenue", "pipeline", "nps", "burn_rate", "headcount"]}',
  preferred_domains TEXT[] DEFAULT ARRAY['operations', 'sales', 'costs'],
  comparison_period TEXT DEFAULT 'quarter',
  auto_refresh_interval INTEGER DEFAULT 300,
  notification_preferences JSONB DEFAULT '{"email_digest": true, "critical_alerts": true}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- REPORT TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'custom' CHECK (template_type IN ('executive', 'department', 'custom', 'board')),
  kpi_selection JSONB NOT NULL DEFAULT '[]',
  chart_configs JSONB DEFAULT '[]',
  layout_config JSONB DEFAULT '{}',
  include_forecasts BOOLEAN DEFAULT false,
  include_anomalies BOOLEAN DEFAULT false,
  include_recommendations BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_system_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- REPORT SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_report_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.kpi_report_templates(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  schedule_config JSONB DEFAULT '{"day_of_week": 1, "hour": 9}',
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'slack', 'in_app')),
  delivery_config JSONB DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'html', 'json')),
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EXECUTIVE REPORTS (Generated Board Reports)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_executive_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'quarterly' CHECK (report_type IN ('weekly', 'monthly', 'quarterly', 'annual', 'board', 'investor')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_summary TEXT,
  key_highlights JSONB DEFAULT '[]',
  risk_flags JSONB DEFAULT '[]',
  opportunity_flags JSONB DEFAULT '[]',
  kpi_snapshots JSONB NOT NULL DEFAULT '[]',
  charts_data JSONB DEFAULT '[]',
  pdf_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- KPI VISIBILITY RULES (RBAC)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name TEXT NOT NULL,
  domain TEXT,
  visible_to_roles TEXT[] DEFAULT ARRAY['admin'],
  sensitive_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  requires_export_approval BOOLEAN DEFAULT false,
  mask_value_for_unauthorized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kpi_name, domain)
);

-- ============================================
-- KPI EXPORT APPROVALS
-- ============================================
CREATE TABLE IF NOT EXISTS public.kpi_export_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kpi_names TEXT[] NOT NULL,
  export_format TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to log KPI access
CREATE OR REPLACE FUNCTION public.log_kpi_access(
  p_user_id UUID,
  p_action_type TEXT,
  p_kpi_name TEXT DEFAULT NULL,
  p_domain TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.kpi_access_log (user_id, action_type, kpi_name, domain, metadata)
  VALUES (p_user_id, p_action_type, p_kpi_name, p_domain, p_metadata)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get audit log summary
CREATE OR REPLACE FUNCTION public.get_kpi_audit_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'unique_users', COUNT(DISTINCT user_id),
    'by_action_type', (
      SELECT jsonb_object_agg(action_type, cnt)
      FROM (
        SELECT action_type, COUNT(*) as cnt
        FROM public.kpi_access_log
        WHERE created_at > now() - (p_days || ' days')::INTERVAL
        GROUP BY action_type
      ) sub
    ),
    'by_domain', (
      SELECT jsonb_object_agg(COALESCE(domain, 'general'), cnt)
      FROM (
        SELECT domain, COUNT(*) as cnt
        FROM public.kpi_access_log
        WHERE created_at > now() - (p_days || ' days')::INTERVAL
        GROUP BY domain
      ) sub
    ),
    'top_kpis', (
      SELECT jsonb_agg(jsonb_build_object('kpi_name', kpi_name, 'count', cnt))
      FROM (
        SELECT kpi_name, COUNT(*) as cnt
        FROM public.kpi_access_log
        WHERE kpi_name IS NOT NULL
          AND created_at > now() - (p_days || ' days')::INTERVAL
        GROUP BY kpi_name
        ORDER BY cnt DESC
        LIMIT 10
      ) sub
    ),
    'period_days', p_days
  ) INTO v_result
  FROM public.kpi_access_log
  WHERE created_at > now() - (p_days || ' days')::INTERVAL;
  
  RETURN COALESCE(v_result, '{"total_actions": 0}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to calculate next report schedule
CREATE OR REPLACE FUNCTION public.calculate_next_report_schedule()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_scheduled_at := CASE NEW.schedule_type
    WHEN 'daily' THEN date_trunc('day', now()) + INTERVAL '1 day' + ((NEW.schedule_config->>'hour')::INTEGER || ' hours')::INTERVAL
    WHEN 'weekly' THEN date_trunc('week', now()) + ((NEW.schedule_config->>'day_of_week')::INTEGER || ' days')::INTERVAL + ((NEW.schedule_config->>'hour')::INTEGER || ' hours')::INTERVAL
    WHEN 'monthly' THEN date_trunc('month', now()) + INTERVAL '1 month' + ((COALESCE(NEW.schedule_config->>'day_of_month', '1'))::INTEGER - 1 || ' days')::INTERVAL + ((NEW.schedule_config->>'hour')::INTEGER || ' hours')::INTERVAL
    WHEN 'quarterly' THEN date_trunc('quarter', now()) + INTERVAL '3 months' + ((NEW.schedule_config->>'hour')::INTEGER || ' hours')::INTERVAL
    ELSE now() + INTERVAL '1 day'
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_next_report_schedule ON public.kpi_report_subscriptions;
CREATE TRIGGER set_next_report_schedule
  BEFORE INSERT OR UPDATE ON public.kpi_report_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_next_report_schedule();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.kpi_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_executive_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_executive_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_visibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_export_approvals ENABLE ROW LEVEL SECURITY;

-- Access Log: Admins can view all, users can view own
CREATE POLICY "Admins can view all access logs" ON public.kpi_access_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own access logs" ON public.kpi_access_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert access logs" ON public.kpi_access_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Executive Preferences: Users manage own
CREATE POLICY "Users manage own executive preferences" ON public.kpi_executive_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Report Templates: All authenticated can view, creators can manage
CREATE POLICY "All can view report templates" ON public.kpi_report_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Creators can manage templates" ON public.kpi_report_templates
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR is_system_template = false)
  WITH CHECK (created_by = auth.uid());

-- Report Subscriptions: Users manage own
CREATE POLICY "Users manage own subscriptions" ON public.kpi_report_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Executive Reports: Admins can view all, creators can manage own
CREATE POLICY "Admins can view all executive reports" ON public.kpi_executive_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Creators manage own reports" ON public.kpi_executive_reports
  FOR ALL TO authenticated
  USING (generated_by = auth.uid())
  WITH CHECK (generated_by = auth.uid());

-- Visibility Rules: Only admins
CREATE POLICY "Only admins manage visibility rules" ON public.kpi_visibility_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Export Approvals: Requesters see own, admins see all
CREATE POLICY "Users see own export requests" ON public.kpi_export_approvals
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users create own export requests" ON public.kpi_export_approvals
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins manage export approvals" ON public.kpi_export_approvals
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert system report templates
INSERT INTO public.kpi_report_templates (name, description, template_type, kpi_selection, is_system_template)
VALUES 
  ('Executive Weekly Summary', 'High-level weekly KPI overview for executives', 'executive', 
   '["revenue", "pipeline_value", "burn_rate", "active_candidates", "time_to_hire"]', true),
  ('Board Quarterly Report', 'Comprehensive quarterly report for board meetings', 'board',
   '["revenue", "mrr", "arr", "customer_count", "nps_score", "employee_count", "runway_months"]', true),
  ('Department Performance', 'Department-specific performance metrics', 'department',
   '["department_specific"]', true)
ON CONFLICT DO NOTHING;