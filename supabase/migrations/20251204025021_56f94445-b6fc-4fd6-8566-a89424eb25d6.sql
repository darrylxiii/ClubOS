-- Update RLS policies for jobs table to enforce stealth visibility
-- Drop existing permissive SELECT policies
DROP POLICY IF EXISTS "Admins and partners can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Allow viewing jobs" ON jobs;
DROP POLICY IF EXISTS "Published jobs are viewable by everyone" ON jobs;
DROP POLICY IF EXISTS "Users can view jobs respecting stealth visibility" ON jobs;

-- Create new policy that respects stealth visibility using existing function
CREATE POLICY "Users can view jobs respecting stealth visibility" ON jobs
FOR SELECT
USING (
  can_view_stealth_job(id, auth.uid())
);