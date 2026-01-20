-- Add stealth columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_stealth BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stealth_enabled_by UUID REFERENCES auth.users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stealth_enabled_at TIMESTAMPTZ;

-- Create job_stealth_viewers table
CREATE TABLE IF NOT EXISTS job_stealth_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stealth_viewers_job ON job_stealth_viewers(job_id);
CREATE INDEX IF NOT EXISTS idx_stealth_viewers_user ON job_stealth_viewers(user_id);
CREATE INDEX IF NOT EXISTS idx_stealth_viewers_granted_by ON job_stealth_viewers(granted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_is_stealth ON jobs(is_stealth) WHERE is_stealth = TRUE;

-- Enable RLS on job_stealth_viewers
ALTER TABLE job_stealth_viewers ENABLE ROW LEVEL SECURITY;

-- Function to check if user can view a stealth job
CREATE OR REPLACE FUNCTION public.can_view_stealth_job(_job_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is admin or strategist
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('admin', 'strategist')
  ) OR EXISTS (
    -- Check if job is not stealth
    SELECT 1 FROM jobs WHERE id = _job_id AND (is_stealth IS NULL OR is_stealth = FALSE)
  ) OR EXISTS (
    -- Check if user created the job
    SELECT 1 FROM jobs WHERE id = _job_id AND created_by = _user_id
  ) OR EXISTS (
    -- Check if user is in the stealth viewers list
    SELECT 1 FROM job_stealth_viewers WHERE job_id = _job_id AND user_id = _user_id
  ) OR EXISTS (
    -- Check if user belongs to the company that owns the job and is a partner
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.company_id = j.company_id
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE j.id = _job_id 
    AND p.id = _user_id 
    AND ur.role = 'partner'
    AND j.is_stealth = FALSE
  )
$$;

-- RLS policies for job_stealth_viewers

-- Admins and strategists can view all stealth viewer records
CREATE POLICY "Admins and strategists can view all stealth viewers"
ON job_stealth_viewers FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'strategist')
);

-- Partners can view stealth viewers for their company's jobs
CREATE POLICY "Partners can view stealth viewers for company jobs"
ON job_stealth_viewers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.company_id = j.company_id
    WHERE j.id = job_stealth_viewers.job_id
    AND p.id = auth.uid()
  )
);

-- Users can see if they have access to a stealth job
CREATE POLICY "Users can see their own stealth access"
ON job_stealth_viewers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins and strategists can insert stealth viewers
CREATE POLICY "Admins and strategists can add stealth viewers"
ON job_stealth_viewers FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'strategist')
);

-- Partners can add stealth viewers for their company's jobs
CREATE POLICY "Partners can add stealth viewers for company jobs"
ON job_stealth_viewers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.company_id = j.company_id
    WHERE j.id = job_stealth_viewers.job_id
    AND p.id = auth.uid()
  )
);

-- Admins and strategists can delete stealth viewers
CREATE POLICY "Admins and strategists can remove stealth viewers"
ON job_stealth_viewers FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'strategist')
);

-- Partners can delete stealth viewers for their company's jobs
CREATE POLICY "Partners can remove stealth viewers for company jobs"
ON job_stealth_viewers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.company_id = j.company_id
    WHERE j.id = job_stealth_viewers.job_id
    AND p.id = auth.uid()
  )
);