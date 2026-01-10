-- Fix overly permissive UPDATE/DELETE policies (correct column references)

-- 1. club_tasks: Users should only update tasks they created or are assigned to
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON club_tasks;
CREATE POLICY "Users can update own or assigned tasks"
ON club_tasks FOR UPDATE
USING (
  auth.uid() = created_by 
  OR auth.uid() IN (SELECT user_id FROM task_assignees ta WHERE ta.task_id = club_tasks.id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. task_assignees: Only task creator, the assignee, or admin can delete
DROP POLICY IF EXISTS "Authenticated users can delete assignees" ON task_assignees;
CREATE POLICY "Task owners can delete assignees"
ON task_assignees FOR DELETE
USING (
  auth.uid() IN (SELECT created_by FROM club_tasks ct WHERE ct.id = task_assignees.task_id)
  OR auth.uid() = task_assignees.user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. task_blockers: Only task creator or admin can delete blockers  
DROP POLICY IF EXISTS "Authenticated users can delete blockers" ON task_blockers;
CREATE POLICY "Task owners can delete blockers"
ON task_blockers FOR DELETE
USING (
  auth.uid() IN (SELECT created_by FROM club_tasks ct WHERE ct.id = task_blockers.blocked_task_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. company_enrichment_cache: Restrict to authenticated users (system cache)
DROP POLICY IF EXISTS "Authenticated users can update company enrichment" ON company_enrichment_cache;
CREATE POLICY "Authenticated users can update company enrichment"
ON company_enrichment_cache FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- 5. crm_reply_intelligence: Restrict to users who own the prospect
DROP POLICY IF EXISTS "Authenticated users can update reply intelligence" ON crm_reply_intelligence;
CREATE POLICY "Users can update reply intelligence for their prospects"
ON crm_reply_intelligence FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM crm_prospects p 
    WHERE p.id = crm_reply_intelligence.prospect_id 
    AND (p.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 6. ml_predictions: Only admin can update predictions (system table)
DROP POLICY IF EXISTS "System can update prediction outcomes" ON ml_predictions;
CREATE POLICY "Admin can update prediction outcomes"
ON ml_predictions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));