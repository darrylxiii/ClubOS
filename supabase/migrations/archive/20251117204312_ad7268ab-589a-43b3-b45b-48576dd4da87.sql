-- Create approval notification logs table
CREATE TABLE IF NOT EXISTS approval_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('candidate', 'partner')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_approval_notification_logs_user_id ON approval_notification_logs(user_id);
CREATE INDEX idx_approval_notification_logs_sent_at ON approval_notification_logs(sent_at);

-- Enable RLS
ALTER TABLE approval_notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins and strategists can view all logs
CREATE POLICY "Admins can view notification logs"
  ON approval_notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- System can insert logs (for edge functions)
CREATE POLICY "System can insert notification logs"
  ON approval_notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);