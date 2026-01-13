-- Extend app_role enum to include partner roles
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

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  requirements jsonb DEFAULT '[]'::jsonb,
  responsibilities jsonb DEFAULT '[]'::jsonb,
  benefits jsonb DEFAULT '[]'::jsonb,
  location text,
  employment_type text DEFAULT 'fulltime',
  salary_min integer,
  salary_max integer,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  pipeline_stages jsonb DEFAULT '[{"name": "Applied", "order": 0}, {"name": "Screening", "order": 1}, {"name": "Interview", "order": 2}, {"name": "Offer", "order": 3}]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  closed_at timestamptz
);

-- Enable RLS on jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create company_members table
CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'recruiter', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS on company_members
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a company member
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND is_active = true
  )
$$;

-- Helper function to check company role
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = _role
      AND is_active = true
  )
$$;

-- RLS Policies for jobs
CREATE POLICY "Company members can view their company jobs"
ON public.jobs FOR SELECT
USING (
  public.is_company_member(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin')
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

-- Published jobs are viewable by authenticated users
CREATE POLICY "Published jobs are viewable by all"
ON public.jobs FOR SELECT
USING (status = 'published');

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

-- Add company_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add job_id to applications
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_company_members_updated_at
BEFORE UPDATE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();