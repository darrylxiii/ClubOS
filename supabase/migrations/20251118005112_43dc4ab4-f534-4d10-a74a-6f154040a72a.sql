-- Phase 6: Data Replication Strategy - Backup Policies
CREATE TABLE IF NOT EXISTS public.backup_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  criticality TEXT NOT NULL CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  replication_frequency INTERVAL NOT NULL,
  retention_days INTEGER NOT NULL,
  is_immutable BOOLEAN DEFAULT false,
  last_backup_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert policies for all critical tables
INSERT INTO public.backup_policies (table_name, criticality, replication_frequency, retention_days, is_immutable, metadata) VALUES
('profiles', 'critical', '1 hour', 90, false, '{"description": "User profiles and authentication data"}'::jsonb),
('applications', 'critical', '1 hour', 90, false, '{"description": "Job applications and candidate submissions"}'::jsonb),
('candidate_profiles', 'critical', '1 hour', 90, false, '{"description": "Candidate personal and professional data"}'::jsonb),
('match_scores', 'high', '6 hours', 60, false, '{"description": "AI-generated match scores"}'::jsonb),
('messages', 'high', '6 hours', 60, false, '{"description": "User communications"}'::jsonb),
('conversations', 'high', '6 hours', 60, false, '{"description": "Conversation threads"}'::jsonb),
('audit_logs', 'critical', '1 hour', 2555, true, '{"description": "Compliance audit trail - 7 years retention"}'::jsonb),
('comprehensive_audit_logs', 'critical', '1 hour', 2555, true, '{"description": "SOC 2 compliance logs"}'::jsonb),
('pii_access_logs', 'critical', '1 hour', 2555, true, '{"description": "GDPR compliance logs"}'::jsonb),
('error_logs', 'medium', '1 day', 30, false, '{"description": "Application error tracking"}'::jsonb),
('webrtc_signals', 'low', '7 days', 7, false, '{"description": "Ephemeral video call data"}'::jsonb),
('bookings', 'high', '6 hours', 90, false, '{"description": "Meeting schedules"}'::jsonb),
('jobs', 'critical', '1 hour', 90, false, '{"description": "Job postings and requirements"}'::jsonb),
('companies', 'critical', '1 hour', 90, false, '{"description": "Company profiles"}'::jsonb),
('subscriptions', 'critical', '1 hour', 90, false, '{"description": "Billing and subscription data"}'::jsonb)
ON CONFLICT (table_name) DO UPDATE SET
  criticality = EXCLUDED.criticality,
  replication_frequency = EXCLUDED.replication_frequency,
  retention_days = EXCLUDED.retention_days,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Phase 4: Region Health Monitoring
CREATE TABLE IF NOT EXISTS public.region_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms INTEGER,
  check_type TEXT NOT NULL DEFAULT 'database',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_region_health_region_created ON public.region_health_checks(region, created_at DESC);
CREATE INDEX idx_region_health_status ON public.region_health_checks(status, created_at DESC);

-- Phase 7: Incident Management
CREATE TABLE IF NOT EXISTS public.incident_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK (severity IN ('P1', 'P2', 'P3', 'P4')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  detected_by TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  root_cause TEXT,
  resolution_notes TEXT,
  affected_services TEXT[],
  affected_users_count INTEGER,
  actual_rto_minutes INTEGER,
  actual_rpo_minutes INTEGER,
  postmortem_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_incident_logs_status ON public.incident_logs(status, created_at DESC);
CREATE INDEX idx_incident_logs_severity ON public.incident_logs(severity, detected_at DESC);
CREATE INDEX idx_incident_logs_assigned ON public.incident_logs(assigned_to, status);

-- Data Integrity Checks
CREATE TABLE IF NOT EXISTS public.data_integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  table_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
  issues_found INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_data_integrity_status ON public.data_integrity_checks(status, created_at DESC);
CREATE INDEX idx_data_integrity_table ON public.data_integrity_checks(table_name, created_at DESC);

-- RLS Policies for new tables
ALTER TABLE public.backup_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_integrity_checks ENABLE ROW LEVEL SECURITY;

-- Admin/Strategist can view all DR data
CREATE POLICY "Admins and strategists can view backup policies"
  ON public.backup_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Service role can manage backup policies"
  ON public.backup_policies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view region health"
  ON public.region_health_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can manage region health"
  ON public.region_health_checks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins and strategists can view incidents"
  ON public.incident_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage incidents"
  ON public.incident_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can manage incidents"
  ON public.incident_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view data integrity checks"
  ON public.data_integrity_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can manage data integrity checks"
  ON public.data_integrity_checks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updating incident_logs.updated_at
CREATE OR REPLACE FUNCTION update_incident_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incident_logs_updated_at_trigger
  BEFORE UPDATE ON public.incident_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_logs_updated_at();

-- Schedule data integrity checks daily
SELECT cron.schedule(
  'data-integrity-check-daily',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/check-data-integrity',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule region health monitoring every 5 minutes
SELECT cron.schedule(
  'region-health-check-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/monitor-region-health',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);