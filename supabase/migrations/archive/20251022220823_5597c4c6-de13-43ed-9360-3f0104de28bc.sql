-- Update RLS policy to allow all authenticated users to view all jobs
-- This allows candidates to see draft and published jobs
DROP POLICY IF EXISTS "Company members can view their company jobs" ON jobs;

CREATE POLICY "Allow viewing jobs"
ON jobs
FOR SELECT
TO public
USING (
  auth.uid() IS NOT NULL  -- All authenticated users can view jobs
);