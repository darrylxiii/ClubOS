-- Add blocking/blocked_by relationships for unified_tasks
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(task_id, depends_on_task_id),
  -- Prevent self-referencing dependencies
  CHECK (task_id != depends_on_task_id)
);

-- Enable RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_dependencies - simplified to work with current schema
CREATE POLICY "Users can view their task dependencies"
  ON public.task_dependencies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_tasks
      WHERE id = task_dependencies.task_id
      AND (
        created_by = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'partner'::app_role)
      )
    )
  );

CREATE POLICY "Users can create task dependencies"
  ON public.task_dependencies
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete their task dependencies"
  ON public.task_dependencies
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'partner'::app_role)
  );

-- Add indexes for better performance
CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

-- Create a view to easily get blocking/blocked relationships
CREATE OR REPLACE VIEW public.task_dependencies_view AS
SELECT 
  td.id,
  td.task_id,
  td.depends_on_task_id,
  t1.title as task_title,
  t1.status as task_status,
  t2.title as depends_on_title,
  t2.status as depends_on_status,
  td.created_at
FROM public.task_dependencies td
JOIN public.unified_tasks t1 ON td.task_id = t1.id
JOIN public.unified_tasks t2 ON td.depends_on_task_id = t2.id;