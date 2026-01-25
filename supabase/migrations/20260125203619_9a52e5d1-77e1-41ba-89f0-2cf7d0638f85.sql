-- Restore missing INSERT policy for applications table
-- This was accidentally dropped in migration 20260110012210

CREATE POLICY "Admins and company members can insert applications"
ON public.applications
FOR INSERT
TO public
WITH CHECK (
  -- Admins can always insert
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Partners can always insert
  has_role(auth.uid(), 'partner'::app_role)
  OR
  -- Strategists can always insert
  has_role(auth.uid(), 'strategist'::app_role)
  OR
  -- Company members can insert for their company's jobs
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.company_members cm ON cm.company_id = j.company_id
    WHERE j.id = applications.job_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
  OR
  -- Users can insert their own applications
  (auth.uid() = user_id AND user_id IS NOT NULL)
);