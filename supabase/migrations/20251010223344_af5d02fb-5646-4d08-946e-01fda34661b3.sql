-- Fix candidate_profiles RLS to add company scoping and prevent cross-company data access

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Admins and partners can view all candidate profiles" ON public.candidate_profiles;

-- Create company-scoped policy for viewing candidate profiles
CREATE POLICY "Company members can view their candidates" ON public.candidate_profiles
FOR SELECT USING (
  -- Admins see everything
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Partners only see candidates for their company's jobs
  EXISTS (
    SELECT 1 
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN company_members cm ON cm.company_id = j.company_id
    WHERE a.user_id = candidate_profiles.user_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
      AND cm.role IN ('owner', 'admin', 'recruiter')
  )
);

-- Keep existing policies for create and update
-- (Admins and partners can create candidate profiles - already exists)
-- (Admins and partners can update candidate profiles - already exists)