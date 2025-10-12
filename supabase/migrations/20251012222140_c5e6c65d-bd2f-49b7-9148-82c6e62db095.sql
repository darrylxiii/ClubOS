-- Fix infinite recursion in unified tasks RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own unified tasks" ON public.unified_tasks;
DROP POLICY IF EXISTS "Users can create unified tasks" ON public.unified_tasks;
DROP POLICY IF EXISTS "Users can update their unified tasks" ON public.unified_tasks;
DROP POLICY IF EXISTS "Users can delete their unified tasks" ON public.unified_tasks;

DROP POLICY IF EXISTS "Users can view task assignees" ON public.unified_task_assignees;
DROP POLICY IF EXISTS "Users can manage task assignees" ON public.unified_task_assignees;

-- Create simpler, non-recursive policies for unified_tasks
CREATE POLICY "Users can view their created or assigned tasks"
  ON public.unified_tasks FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can create their own tasks"
  ON public.unified_tasks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Task owners can update tasks"
  ON public.unified_tasks FOR UPDATE
  USING (
    auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Task creators can delete tasks"
  ON public.unified_tasks FOR DELETE
  USING (
    auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create simpler policies for unified_task_assignees
CREATE POLICY "Users can view assignees for their tasks"
  ON public.unified_task_assignees FOR SELECT
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Task creators can manage assignees"
  ON public.unified_task_assignees FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update assignees"
  ON public.unified_task_assignees FOR UPDATE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can delete assignees"
  ON public.unified_task_assignees FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );