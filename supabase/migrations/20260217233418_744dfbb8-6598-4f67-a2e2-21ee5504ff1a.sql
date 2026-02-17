-- Add project_id column to unified_tasks
ALTER TABLE unified_tasks
  ADD COLUMN project_id uuid REFERENCES marketplace_projects(id) ON DELETE SET NULL;

-- Add INSERT policy on candidate_interactions for admin/partner/strategist
CREATE POLICY "Admins partners strategists can insert interactions"
  ON candidate_interactions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'partner') OR
    has_role(auth.uid(), 'strategist')
  );