-- Fix RLS policy on candidate_profiles to support candidates without user_id
DROP POLICY IF EXISTS "Company members can view their candidates" ON public.candidate_profiles;

CREATE POLICY "Company members can view their candidates" 
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (
  -- Admins can see everything
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Company members can see candidates in their jobs (by user_id OR candidate_id)
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN company_members cm ON cm.company_id = j.company_id
    WHERE (
      (a.user_id IS NOT NULL AND a.user_id = candidate_profiles.user_id)
      OR a.candidate_id = candidate_profiles.id
    )
    AND cm.user_id = auth.uid()
    AND cm.is_active = true
    AND cm.role IN ('owner', 'admin', 'recruiter')
  )
  OR
  -- Strategists can see candidates assigned to them
  has_role(auth.uid(), 'strategist'::app_role)
  OR
  -- Partners can see all candidates
  has_role(auth.uid(), 'partner'::app_role)
);