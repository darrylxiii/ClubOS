-- Add RLS policies for candidates to view their own rejected applications and feedback

-- Policy: Candidates can view their own rejected applications
CREATE POLICY "Users can view their own rejected applications"
ON applications FOR SELECT
USING (auth.uid() = user_id AND status = 'rejected');

-- Policy: Candidates can view feedback visible to them via candidate_interactions
CREATE POLICY "Users can view their candidate feedback"
ON candidate_interactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications 
    WHERE applications.id = candidate_interactions.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Policy: Candidates can view their company feedback through application_id
CREATE POLICY "Users can view their company candidate feedback"
ON company_candidate_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications 
    WHERE applications.id = company_candidate_feedback.application_id
    AND applications.user_id = auth.uid()
  )
);