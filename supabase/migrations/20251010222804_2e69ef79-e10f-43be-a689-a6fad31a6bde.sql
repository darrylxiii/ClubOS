-- Fix applications table RLS policies to prevent public data exposure

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can create their own applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can view all applications with null user" ON public.applications;

-- Create secure policy for users to view only their own applications
CREATE POLICY "Users can view their own applications" ON public.applications
FOR SELECT USING (
  auth.uid() = user_id AND user_id IS NOT NULL
);

-- Create secure policy for users to create applications
CREATE POLICY "Users can create applications" ON public.applications
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND user_id IS NOT NULL)
  OR
  -- Allow company members (recruiters) to create applications for candidates
  (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.company_members cm ON cm.company_id = j.company_id
    WHERE j.id = job_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin', 'recruiter')
      AND cm.is_active = true
  ))
);

-- Create policy for company members to view applications for their jobs
CREATE POLICY "Company members can view job applications" ON public.applications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.company_members cm ON cm.company_id = j.company_id
    WHERE j.id = applications.job_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
);

-- Keep admin access policy (already exists as "Admins can view all applications")