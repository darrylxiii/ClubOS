-- Add approval tracking fields to candidate_profiles
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create application activity log table
CREATE TABLE IF NOT EXISTS candidate_application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidate_logs_profile ON candidate_application_logs(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_logs_created ON candidate_application_logs(created_at DESC);

-- Enable RLS on application logs
ALTER TABLE candidate_application_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view application logs
CREATE POLICY "Admins can view application logs"
  ON candidate_application_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can insert application logs
CREATE POLICY "Admins can insert application logs"
  ON candidate_application_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Update candidate_profiles RLS policies to allow admins to update
CREATE POLICY "Admins can update candidate profiles"
  ON candidate_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );