-- Phase 1: Security fixes, audit logs, and user presence system

-- Fix security definer functions by setting search_path
ALTER FUNCTION has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION get_user_role(uuid) SET search_path = public;
ALTER FUNCTION update_dm_conversation_timestamp() SET search_path = public;
ALTER FUNCTION update_updated_at_column() SET search_path = public;

-- Create audit logs table for compliance
CREATE TABLE IF NOT EXISTS livehub_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON livehub_audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON livehub_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON livehub_audit_logs(action_type);

-- RLS for audit logs (admin-only read)
ALTER TABLE livehub_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
ON livehub_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create user_presence_extended table for rich presence
CREATE TABLE IF NOT EXISTS user_presence_extended (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'dnd', 'invisible', 'offline')),
  custom_status text,
  custom_status_emoji text,
  custom_status_expires_at timestamptz,
  current_activity text,
  timezone text DEFAULT 'UTC',
  last_seen timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for user_presence_extended
ALTER TABLE user_presence_extended ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all presence (except invisible)"
ON user_presence_extended FOR SELECT
TO authenticated
USING (status != 'invisible' OR user_id = auth.uid());

CREATE POLICY "Users can update own presence"
ON user_presence_extended FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own presence"
ON user_presence_extended FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Function to update presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_presence_timestamp_trigger
BEFORE UPDATE ON user_presence_extended
FOR EACH ROW
EXECUTE FUNCTION update_presence_timestamp();

-- Auto-delete old audit logs (retain 90 days)
CREATE OR REPLACE FUNCTION auto_delete_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM livehub_audit_logs
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence_extended;