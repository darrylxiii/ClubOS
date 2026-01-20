-- CRITICAL FIX: Allow users to insert their own candidate profile during onboarding
-- This fixes the account creation bug after phone verification

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can insert their own candidate profile" ON candidate_profiles;

-- Create new policy allowing users to insert their own profile
CREATE POLICY "Users can insert their own candidate profile"
ON candidate_profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Also create security_logs table for monitoring
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);

-- Enable RLS on security_logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- System can insert security logs (no user authentication needed)
CREATE POLICY "System can insert security logs"
ON security_logs
FOR INSERT
TO public
WITH CHECK (true);

-- Authenticated users can only read their own logs
CREATE POLICY "Users can read their own security logs"
ON security_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);