-- Fix critical RLS bug: Allow company members and strategists to UPDATE applications
DROP POLICY IF EXISTS "Company members can update applications" ON applications;

CREATE POLICY "Company members can update applications"
ON applications
FOR UPDATE
TO public
USING (
  -- Allow admins, partners, strategists to update
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'partner')
  OR has_role(auth.uid(), 'strategist')
  -- Allow company members to update applications for their company's jobs
  OR EXISTS (
    SELECT 1 FROM jobs j
    JOIN company_members cm ON cm.company_id = j.company_id
    WHERE j.id = applications.job_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
  -- Allow users to update their own applications
  OR (auth.uid() = user_id AND user_id IS NOT NULL)
)
WITH CHECK (
  -- Same permissions for WITH CHECK
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'partner')
  OR has_role(auth.uid(), 'strategist')
  OR EXISTS (
    SELECT 1 FROM jobs j
    JOIN company_members cm ON cm.company_id = j.company_id
    WHERE j.id = applications.job_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
  OR (auth.uid() = user_id AND user_id IS NOT NULL)
);

-- Add index for performance on current_stage_index filtering
CREATE INDEX IF NOT EXISTS idx_applications_current_stage_index 
ON applications(current_stage_index) 
WHERE status != 'rejected';