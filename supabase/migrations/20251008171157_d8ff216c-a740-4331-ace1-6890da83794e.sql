-- Fix applications.job_id foreign key by properly handling dependent policies

-- Step 1: Drop policies that depend on job_id
DROP POLICY IF EXISTS "Company members can view scorecards for their jobs" ON public.candidate_scorecards;
DROP POLICY IF EXISTS "Company members can create scorecards" ON public.candidate_scorecards;
DROP POLICY IF EXISTS "Company members can view comments" ON public.candidate_comments;
DROP POLICY IF EXISTS "Company members can create comments" ON public.candidate_comments;
DROP POLICY IF EXISTS "Company members can view applicant profiles" ON public.profiles;

-- Step 2: Create new UUID column
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS job_id_uuid UUID;

-- Step 3: Migrate data
UPDATE public.applications 
SET job_id_uuid = job_id::uuid 
WHERE job_id IS NOT NULL;

-- Step 4: Drop old column (now safe)
ALTER TABLE public.applications DROP COLUMN job_id CASCADE;

-- Step 5: Rename new column
ALTER TABLE public.applications RENAME COLUMN job_id_uuid TO job_id;

-- Step 6: Add constraints
ALTER TABLE public.applications ALTER COLUMN job_id SET NOT NULL;
ALTER TABLE public.applications 
ADD CONSTRAINT applications_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

-- Step 7: Create index
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);

-- Step 8: Recreate the policies with corrected logic
CREATE POLICY "Company members can view scorecards for their jobs" 
ON public.candidate_scorecards 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = candidate_scorecards.application_id 
    AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Company members can create scorecards" 
ON public.candidate_scorecards 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = candidate_scorecards.application_id 
    AND is_company_member(auth.uid(), j.company_id)
  ) AND evaluator_id = auth.uid()
);

CREATE POLICY "Company members can view comments" 
ON public.candidate_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = candidate_comments.application_id 
    AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Company members can create comments" 
ON public.candidate_comments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = candidate_comments.application_id 
    AND is_company_member(auth.uid(), j.company_id)
  ) AND user_id = auth.uid()
);

-- Recreate profiles policy if it exists
CREATE POLICY "Company members can view applicant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = profiles.id 
    AND (is_company_member(auth.uid(), j.company_id) OR has_role(auth.uid(), 'admin'))
  ) OR auth.uid() = profiles.id
);

-- Ensure candidate_profiles supports both users and standalone candidates
ALTER TABLE public.candidate_profiles ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON public.candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_email ON public.candidate_profiles(email);

-- Add helpful constraint
ALTER TABLE public.candidate_profiles DROP CONSTRAINT IF EXISTS candidate_profiles_user_or_email_check;
ALTER TABLE public.candidate_profiles 
ADD CONSTRAINT candidate_profiles_user_or_email_check 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

COMMENT ON COLUMN public.candidate_profiles.user_id IS 'References auth.users - nullable to support candidates who are not yet platform users';