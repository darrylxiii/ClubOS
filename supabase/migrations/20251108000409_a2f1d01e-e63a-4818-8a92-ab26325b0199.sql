-- Step 1: Add DELETE RLS policy for candidate_profiles
-- Allow admins, partners, and strategists to delete candidate profiles (needed for cleanup)
CREATE POLICY "Admins and partners can delete candidate profiles"
ON public.candidate_profiles
FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'partner'::app_role)
  OR has_role(auth.uid(), 'strategist'::app_role)
);

-- Step 2: Clean up orphaned candidate profiles (profiles with no applications)
DELETE FROM public.candidate_profiles
WHERE id IN (
  SELECT cp.id
  FROM candidate_profiles cp
  LEFT JOIN applications a ON cp.id = a.candidate_id
  WHERE a.id IS NULL
    AND cp.created_at > NOW() - INTERVAL '2 days'
);

-- Step 3: Simplify applications RLS policy for INSERT
-- Drop the overly complex policy
DROP POLICY IF EXISTS "Allow application inserts" ON public.applications;

-- Create a simpler, more permissive policy for INSERT
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