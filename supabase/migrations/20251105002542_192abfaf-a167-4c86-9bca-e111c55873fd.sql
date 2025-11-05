-- Update RLS policies for jobs table to allow partners to edit their company's jobs

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Partners can update jobs for their company" ON public.jobs;
DROP POLICY IF EXISTS "Admins and partners can update jobs" ON public.jobs;

-- Create policy for partners to update jobs from their company
CREATE POLICY "Partners and strategists can update their company jobs"
  ON public.jobs
  FOR UPDATE
  USING (
    -- User is admin (can edit all jobs)
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- User is partner/strategist and member of the job's company
    (
      (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'strategist'::app_role))
      AND
      EXISTS (
        SELECT 1 
        FROM public.company_members 
        WHERE user_id = auth.uid() 
          AND company_id = jobs.company_id
          AND is_active = true
      )
    )
  );

-- Ensure partners can also view all jobs (needed for editing)
DROP POLICY IF EXISTS "Anyone can view published jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public jobs are viewable by everyone" ON public.jobs;

CREATE POLICY "Published jobs are viewable by everyone"
  ON public.jobs
  FOR SELECT
  USING (status = 'published' OR status = 'draft');

-- Allow admins and company partners to select any job
CREATE POLICY "Admins and partners can view all jobs"
  ON public.jobs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR
    has_role(auth.uid(), 'partner'::app_role)
    OR
    has_role(auth.uid(), 'strategist'::app_role)
  );