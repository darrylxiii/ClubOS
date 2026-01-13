-- Create admin_member_approval_actions table to track approval workflow actions
CREATE TABLE IF NOT EXISTS admin_member_approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('merge', 'create_profile', 'assign_to_job', 'skip_merge', 'approve')),
  action_data JSONB DEFAULT '{}'::jsonb,
  action_result TEXT CHECK (action_result IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON admin_member_approval_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_approved_by ON admin_member_approval_actions(approved_by);
CREATE INDEX IF NOT EXISTS idx_approval_actions_created_at ON admin_member_approval_actions(created_at DESC);

-- Enable RLS
ALTER TABLE admin_member_approval_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and strategists can view approval actions
CREATE POLICY "Admins and strategists can view approval actions"
  ON admin_member_approval_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist')
    )
  );

-- Policy: Only admins and strategists can insert approval actions
CREATE POLICY "Admins and strategists can insert approval actions"
  ON admin_member_approval_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'strategist')
    )
  );

-- Add comment
COMMENT ON TABLE admin_member_approval_actions IS 'Tracks all actions taken during member approval workflow including merges, profile creation, and job assignments';