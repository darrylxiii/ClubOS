-- Phase 1: Enhance job_team_assignments table to support external users

-- Step 1: Make company_member_id nullable
ALTER TABLE job_team_assignments 
  ALTER COLUMN company_member_id DROP NOT NULL;

-- Step 2: Add new columns for external user assignment
ALTER TABLE job_team_assignments 
  ADD COLUMN external_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN assignment_type TEXT DEFAULT 'company_member' 
    CHECK (assignment_type IN ('company_member', 'tqc_team', 'external_consultant')),
  ADD COLUMN assigned_by UUID REFERENCES auth.users(id),
  ADD COLUMN assignment_reason TEXT,
  ADD COLUMN assignment_metadata JSONB DEFAULT '{}'::jsonb;

-- Step 3: Add check constraint - must have either company_member_id OR external_user_id
ALTER TABLE job_team_assignments 
  ADD CONSTRAINT check_assignment_type 
  CHECK (
    (assignment_type = 'company_member' AND company_member_id IS NOT NULL AND external_user_id IS NULL) 
    OR 
    (assignment_type IN ('tqc_team', 'external_consultant') AND external_user_id IS NOT NULL AND company_member_id IS NULL)
  );

-- Step 4: Add indexes for performance
CREATE INDEX idx_job_team_assignments_external_user 
  ON job_team_assignments(external_user_id) 
  WHERE external_user_id IS NOT NULL;

CREATE INDEX idx_job_team_assignments_type 
  ON job_team_assignments(job_id, assignment_type);

CREATE INDEX idx_job_team_assignments_assigned_by 
  ON job_team_assignments(assigned_by);

-- Step 5: Update RLS policies

-- TQC team can view all job teams
CREATE POLICY "TQC team can view all job teams"
ON job_team_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- TQC team can manage job teams (insert, update, delete)
CREATE POLICY "TQC team can manage job teams"
ON job_team_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "TQC team can update job teams"
ON job_team_assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "TQC team can delete job teams"
ON job_team_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'strategist')
  )
);

-- External team members can view their own assignments
CREATE POLICY "External members can view their assignments"
ON job_team_assignments FOR SELECT
USING (
  auth.uid() = external_user_id
);

-- Step 6: Backfill existing records with assignment_type
UPDATE job_team_assignments
SET assignment_type = 'company_member'
WHERE company_member_id IS NOT NULL AND assignment_type IS NULL;

-- Step 7: Create enhanced function for checking TQC team email with job context
CREATE OR REPLACE FUNCTION public.is_tqc_team_email_for_job(
  check_email TEXT,
  check_job_id UUID DEFAULT NULL
)
RETURNS TABLE(
  is_match BOOLEAN,
  user_id UUID,
  full_name TEXT,
  roles TEXT[],
  assigned_to_job BOOLEAN,
  job_role TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as is_match,
    p.id as user_id,
    p.full_name,
    array_agg(DISTINCT ur.role::TEXT) as roles,
    EXISTS(
      SELECT 1 FROM job_team_assignments jta
      WHERE jta.external_user_id = p.id
      AND (check_job_id IS NULL OR jta.job_id = check_job_id)
    ) as assigned_to_job,
    (
      SELECT jta.job_role
      FROM job_team_assignments jta
      WHERE jta.external_user_id = p.id
      AND jta.job_id = check_job_id
      LIMIT 1
    ) as job_role
  FROM profiles p
  INNER JOIN user_roles ur ON p.id = ur.user_id
  WHERE LOWER(p.email) = LOWER(check_email)
    AND ur.role IN ('admin', 'strategist')
  GROUP BY p.id, p.full_name
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT[], FALSE, NULL::TEXT;
  END IF;
END;
$$;