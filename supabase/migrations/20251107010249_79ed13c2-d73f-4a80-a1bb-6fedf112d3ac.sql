-- Phase 1: Security & Compliance Foundation

-- 1.1 SSO Connections Table
CREATE TABLE IF NOT EXISTS sso_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  idp_type VARCHAR(50) NOT NULL CHECK (idp_type IN ('saml', 'oidc')),
  idp_name VARCHAR(100) NOT NULL,
  entity_id TEXT NOT NULL,
  sso_url TEXT NOT NULL,
  certificate TEXT,
  metadata_xml TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sso_connections_company ON sso_connections(company_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE sso_connections ENABLE ROW LEVEL SECURITY;

-- Only company admins can manage SSO
CREATE POLICY "Company admins can manage SSO connections"
  ON sso_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = sso_connections.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

-- 1.2 Unified Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  actor_role VARCHAR(50),
  resource_type VARCHAR(50),
  resource_id UUID,
  action VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  result VARCHAR(20) DEFAULT 'success' CHECK (result IN ('success', 'failed', 'denied')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_events_type ON audit_events(event_type, created_at DESC);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);

-- Enable RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit events
CREATE POLICY "Admins can view all audit events"
  ON audit_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Users can view their own audit events
CREATE POLICY "Users can view their own audit events"
  ON audit_events
  FOR SELECT
  USING (actor_id = auth.uid());

-- System can insert audit events
CREATE POLICY "Service role can insert audit events"
  ON audit_events
  FOR INSERT
  WITH CHECK (true);

-- 1.3 GDPR Deletion Requests Table
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reason TEXT,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_deletion_requests_user ON deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_scheduled ON deletion_requests(scheduled_for) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own deletion requests
CREATE POLICY "Users can manage their own deletion requests"
  ON deletion_requests
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all deletion requests
CREATE POLICY "Admins can view deletion requests"
  ON deletion_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 1.4 Data Export Requests Table
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  export_url TEXT,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_data_export_requests_user ON data_export_requests(user_id);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status, requested_at DESC);

-- Enable RLS
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can only access their own export requests
CREATE POLICY "Users can manage their own export requests"
  ON data_export_requests
  FOR ALL
  USING (user_id = auth.uid());

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type VARCHAR(50),
  p_actor_id UUID,
  p_actor_email VARCHAR(255),
  p_actor_role VARCHAR(50),
  p_resource_type VARCHAR(50),
  p_resource_id UUID,
  p_action VARCHAR(100),
  p_metadata JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_result VARCHAR(20) DEFAULT 'success'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO audit_events (
    event_type,
    actor_id,
    actor_email,
    actor_role,
    resource_type,
    resource_id,
    action,
    metadata,
    ip_address,
    user_agent,
    result
  ) VALUES (
    p_event_type,
    p_actor_id,
    p_actor_email,
    p_actor_role,
    p_resource_type,
    p_resource_id,
    p_action,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_result
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Update trigger function to log updates
CREATE OR REPLACE FUNCTION update_updated_at_and_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add trigger for sso_connections
CREATE TRIGGER update_sso_connections_updated_at
  BEFORE UPDATE ON sso_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_and_log();