-- Extend app_role enum (only if not exists)
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'partner';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'company_admin';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'recruiter';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company members can view their company jobs" ON public.jobs;
DROP POLICY IF EXISTS "Company admins can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Company admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Company owners can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Published jobs are viewable by all" ON public.jobs;
DROP POLICY IF EXISTS "Company members can view their team" ON public.company_members;
DROP POLICY IF EXISTS "Company owners and admins can manage members" ON public.company_members;

-- Recreate RLS Policies for jobs
CREATE POLICY "Company members can view their company jobs"
ON public.jobs FOR SELECT
USING (
  public.is_company_member(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin')
  OR status = 'published'
);

CREATE POLICY "Company admins can create jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  public.has_company_role(auth.uid(), company_id, 'owner')
  OR public.has_company_role(auth.uid(), company_id, 'admin')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Company admins can update jobs"
ON public.jobs FOR UPDATE
USING (
  public.has_company_role(auth.uid(), company_id, 'owner')
  OR public.has_company_role(auth.uid(), company_id, 'admin')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Company owners can delete jobs"
ON public.jobs FOR DELETE
USING (
  public.has_company_role(auth.uid(), company_id, 'owner')
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for company_members
CREATE POLICY "Company members can view their team"
ON public.company_members FOR SELECT
USING (
  public.is_company_member(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Company owners and admins can manage members"
ON public.company_members FOR ALL
USING (
  public.has_company_role(auth.uid(), company_id, 'owner')
  OR public.has_company_role(auth.uid(), company_id, 'admin')
  OR public.has_role(auth.uid(), 'admin')
);

-- Add company_id to profiles if not exists
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add job_id to applications if not exists
DO $$ BEGIN
  ALTER TABLE public.applications ADD COLUMN job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;