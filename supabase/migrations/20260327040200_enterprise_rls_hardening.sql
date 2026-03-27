-- Phase 16: Enterprise RLS Hardening Protocol

-- 1. The Phantom Injection Patch (Add WITH CHECK to INSERT statements)
-- Fix Jobs INSERT
DROP POLICY IF EXISTS "Company members can create jobs" ON public.jobs;
CREATE POLICY "Company members can create jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (
  is_company_member(auth.uid(), company_id) OR public.is_admin_jwt()
);

-- Fix Applications INSERT
DROP POLICY IF EXISTS "Admins and company members can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Candidates can insert their own applications" ON public.applications;

CREATE POLICY "Candidates can insert their own applications"
ON public.applications
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Admins and company members can insert applications"
ON public.applications
FOR INSERT
WITH CHECK (
  public.is_admin_jwt() OR 
  is_company_member(auth.uid(), (SELECT company_id FROM public.jobs WHERE id = job_id))
);


-- 2. The Role Leak Patch (Zero-Trust Privacy)
-- Delete global role leaking
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Secure standard user_roles access
CREATE POLICY "Users can only view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid() OR public.is_admin_jwt());


-- 3. The Strategist Paradox Patch (Unblocking Recruiter Workflows)
-- Allow Strategists to global access companies to create jobs for them
DROP POLICY IF EXISTS "Strategists view assigned companies" ON public.companies;
CREATE POLICY "Strategists view all companies globally" 
ON public.companies 
FOR SELECT 
USING (
  has_role(auth.uid(), 'strategist'::app_role) OR public.is_admin_jwt()
);


-- 4. The Open-Book Mitigation (Candidate Profile Privacy)
-- A candidate profile should only be visible to a company member if that candidate applied to a job that the company owns.
DROP POLICY IF EXISTS "Company members can view their candidates" ON public.candidate_profiles;

CREATE POLICY "Company members view applied candidates" 
ON public.candidate_profiles 
FOR SELECT 
USING (
  public.is_admin_jwt() OR 
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 
    FROM public.applications a 
    JOIN public.jobs j ON j.id = a.job_id 
    JOIN public.company_members cm ON cm.company_id = j.company_id 
    WHERE a.user_id = candidate_profiles.user_id 
      AND cm.user_id = auth.uid() 
      AND cm.is_active = true 
      AND cm.role IN ('owner', 'admin', 'recruiter')
  )
);
