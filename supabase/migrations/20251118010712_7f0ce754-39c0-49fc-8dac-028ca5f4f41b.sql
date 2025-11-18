-- =====================================================
-- PHASE 8: Enterprise DR - Missing Critical Components
-- =====================================================

-- 1. Incident Response & Escalation
CREATE TABLE IF NOT EXISTS public.incident_response_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incident_logs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'detected', 'notified', 'acknowledged', 'escalated', 
    'investigating', 'mitigated', 'resolved', 'closed'
  )),
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_details JSONB,
  automated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incident_response_actions_incident ON public.incident_response_actions(incident_id);
CREATE INDEX idx_incident_response_actions_type ON public.incident_response_actions(action_type);

-- 2. DR Drill Schedule & Results
CREATE TABLE IF NOT EXISTS public.dr_drill_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_name TEXT NOT NULL,
  drill_type TEXT NOT NULL CHECK (drill_type IN (
    'full_failover', 'partial_failover', 'backup_restore', 
    'pitr_test', 'communication_test', 'tabletop'
  )),
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 2,
  participants TEXT[],
  objectives TEXT[],
  success_criteria JSONB,
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'cancelled', 'failed'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dr_drill_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID REFERENCES public.dr_drill_schedule(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rto_achieved_minutes INTEGER,
  rpo_achieved_minutes INTEGER,
  success_score INTEGER CHECK (success_score >= 0 AND success_score <= 100),
  issues_found TEXT[],
  lessons_learned TEXT[],
  action_items JSONB,
  participants_feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Post-Incident Reviews (PIR)
CREATE TABLE IF NOT EXISTS public.post_incident_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incident_logs(id) ON DELETE CASCADE,
  review_date TIMESTAMPTZ NOT NULL,
  conducted_by UUID REFERENCES auth.users(id),
  attendees UUID[],
  incident_summary TEXT NOT NULL,
  root_cause TEXT,
  contributing_factors TEXT[],
  timeline JSONB, -- [{timestamp, event, actor}]
  what_went_well TEXT[],
  what_went_wrong TEXT[],
  action_items JSONB, -- [{action, owner, due_date, status}]
  follow_up_date TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. On-Call & Escalation Contacts
CREATE TABLE IF NOT EXISTS public.dr_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN (
    'primary_oncall', 'secondary_oncall', 'executive', 
    'technical_lead', 'communication_lead', 'external_vendor'
  )),
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  escalation_level INTEGER NOT NULL CHECK (escalation_level >= 1 AND escalation_level <= 5),
  availability_schedule JSONB, -- {days: [], hours: {start, end}, timezone}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dr_contacts_role ON public.dr_contacts(role);
CREATE INDEX idx_dr_contacts_escalation ON public.dr_contacts(escalation_level);

-- 5. Recovery Playbooks
CREATE TABLE IF NOT EXISTS public.recovery_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN (
    'database_failure', 'region_outage', 'data_corruption',
    'security_breach', 'ddos_attack', 'storage_failure',
    'edge_function_failure', 'network_partition', 'human_error'
  )),
  severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  estimated_rto_minutes INTEGER,
  estimated_rpo_minutes INTEGER,
  prerequisites TEXT[],
  steps JSONB NOT NULL, -- [{step_number, action, responsible_role, estimated_time, validation}]
  rollback_steps JSONB,
  decision_points JSONB, -- [{condition, if_true_goto, if_false_goto}]
  required_contacts TEXT[],
  external_dependencies TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recovery_playbooks_scenario ON public.recovery_playbooks(scenario_type);

-- 6. Service Dependency Mapping
CREATE TABLE IF NOT EXISTS public.service_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN (
    'database', 'edge_function', 'storage', 'auth', 
    'external_api', 'cdn', 'monitoring'
  )),
  depends_on_service_id UUID REFERENCES public.service_dependencies(id),
  dependency_type TEXT NOT NULL CHECK (dependency_type IN (
    'hard', 'soft', 'optional'
  )),
  criticality TEXT NOT NULL CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  health_check_url TEXT,
  sla_uptime_pct NUMERIC(5,2),
  mttr_minutes INTEGER, -- Mean Time To Repair
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Recovery Metrics Tracking
CREATE TABLE IF NOT EXISTS public.recovery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incident_logs(id),
  metric_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actual_rto_minutes INTEGER,
  actual_rpo_minutes INTEGER,
  target_rto_minutes INTEGER NOT NULL DEFAULT 240, -- 4 hours
  target_rpo_minutes INTEGER NOT NULL DEFAULT 60, -- 1 hour
  data_loss_detected BOOLEAN DEFAULT false,
  data_loss_amount_mb NUMERIC,
  recovery_success BOOLEAN NOT NULL,
  recovery_method TEXT, -- 'pitr', 'snapshot', 'failover', 'manual'
  downtime_minutes INTEGER,
  services_affected TEXT[],
  cost_impact_usd NUMERIC,
  customer_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recovery_metrics_date ON public.recovery_metrics(metric_date);

-- 8. Compliance Audit Trail
CREATE TABLE IF NOT EXISTS public.dr_compliance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audit_type TEXT NOT NULL CHECK (audit_type IN (
    'backup_verification', 'recovery_test', 'access_review',
    'policy_review', 'drill_execution', 'incident_response'
  )),
  compliance_framework TEXT, -- 'SOC2', 'ISO27001', 'GDPR', 'HIPAA'
  control_id TEXT,
  finding_type TEXT CHECK (finding_type IN ('pass', 'fail', 'gap', 'observation')),
  finding_details TEXT,
  evidence JSONB, -- links, screenshots, logs
  remediation_required BOOLEAN DEFAULT false,
  remediation_due_date TIMESTAMPTZ,
  auditor UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. External Health Monitor Results
CREATE TABLE IF NOT EXISTS public.external_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  endpoint_url TEXT NOT NULL,
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN (
    'api', 'database', 'storage', 'auth', 'edge_function'
  )),
  response_time_ms INTEGER,
  status_code INTEGER,
  is_healthy BOOLEAN NOT NULL,
  error_message TEXT,
  check_source TEXT NOT NULL, -- 'uptime_robot', 'pingdom', 'custom'
  geographic_region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_external_health_timestamp ON public.external_health_checks(check_timestamp);
CREATE INDEX idx_external_health_type ON public.external_health_checks(endpoint_type);

-- 10. Data Consistency Validation Logs
CREATE TABLE IF NOT EXISTS public.data_consistency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validation_type TEXT NOT NULL CHECK (validation_type IN (
    'referential_integrity', 'row_count', 'checksum',
    'duplicate_check', 'orphan_check', 'constraint_check'
  )),
  table_name TEXT NOT NULL,
  records_checked INTEGER,
  issues_found INTEGER,
  issue_details JSONB,
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  auto_fixed BOOLEAN DEFAULT false,
  fix_actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_consistency_table ON public.data_consistency_logs(table_name);

-- Enable RLS on all new tables
ALTER TABLE public.incident_response_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_drill_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_drill_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_incident_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_compliance_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_consistency_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin/Strategist only)
CREATE POLICY "Admin full access incident_response_actions"
  ON public.incident_response_actions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access dr_drill_schedule"
  ON public.dr_drill_schedule FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access dr_drill_results"
  ON public.dr_drill_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access post_incident_reviews"
  ON public.post_incident_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access dr_contacts"
  ON public.dr_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access recovery_playbooks"
  ON public.recovery_playbooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access service_dependencies"
  ON public.service_dependencies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access recovery_metrics"
  ON public.recovery_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access dr_compliance_audit"
  ON public.dr_compliance_audit FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access external_health_checks"
  ON public.external_health_checks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin full access data_consistency_logs"
  ON public.data_consistency_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
    )
  );

-- Update triggers
CREATE TRIGGER update_dr_drill_schedule_updated_at
  BEFORE UPDATE ON public.dr_drill_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_incident_reviews_updated_at
  BEFORE UPDATE ON public.post_incident_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dr_contacts_updated_at
  BEFORE UPDATE ON public.dr_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recovery_playbooks_updated_at
  BEFORE UPDATE ON public.recovery_playbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_dependencies_updated_at
  BEFORE UPDATE ON public.service_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();