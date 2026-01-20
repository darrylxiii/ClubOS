-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tasks they created or are assigned to" ON unified_tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON unified_tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON unified_tasks;
DROP POLICY IF EXISTS "Admins can do everything" ON unified_tasks;

-- Create role-based view policies for unified_tasks
CREATE POLICY "Regular users view their own tasks"
ON unified_tasks
FOR SELECT
TO authenticated
USING (
  -- Users see tasks they created
  created_by = auth.uid()
  OR
  -- Or tasks they're assigned to
  EXISTS (
    SELECT 1 FROM unified_task_assignees
    WHERE unified_task_assignees.task_id = unified_tasks.id
    AND unified_task_assignees.user_id = auth.uid()
  )
);

CREATE POLICY "Partners view their team tasks"
ON unified_tasks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role)
  AND (
    -- Tasks created by team members in same company
    EXISTS (
      SELECT 1 FROM company_members cm1
      JOIN company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = unified_tasks.created_by
      AND cm1.is_active = true
      AND cm2.is_active = true
    )
    OR
    -- Tasks assigned to team members in same company
    EXISTS (
      SELECT 1 FROM unified_task_assignees uta
      JOIN company_members cm1 ON cm1.user_id = auth.uid()
      JOIN company_members cm2 ON cm2.user_id = uta.user_id
      WHERE uta.task_id = unified_tasks.id
      AND cm1.company_id = cm2.company_id
      AND cm1.is_active = true
      AND cm2.is_active = true
    )
  )
);

CREATE POLICY "Admins view all tasks"
ON unified_tasks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert/Update policies
CREATE POLICY "Users can create tasks"
ON unified_tasks
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their tasks"
ON unified_tasks
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM unified_task_assignees
    WHERE unified_task_assignees.task_id = unified_tasks.id
    AND unified_task_assignees.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
  OR
  has_role(auth.uid(), 'partner'::app_role)
);

CREATE POLICY "Admins and creators can delete tasks"
ON unified_tasks
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  has_role(auth.uid(), 'admin'::app_role)
);