
-- Link tasks to jobs and companies
ALTER TABLE public.unified_tasks
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_unified_tasks_job_id ON public.unified_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_company_id ON public.unified_tasks(company_id);

-- Link objectives to jobs and companies
ALTER TABLE public.club_objectives
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_club_objectives_job_id ON public.club_objectives(job_id);

-- RLS policy for partners to insert tasks for their company's jobs
CREATE POLICY "partners_insert_tasks_for_company_jobs"
ON public.unified_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  job_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.jobs j ON j.company_id = cm.company_id
    WHERE cm.user_id = auth.uid()
    AND j.id = unified_tasks.job_id
  )
);

-- RLS policy for partners to view tasks for their company's jobs
CREATE POLICY "partners_view_tasks_for_company_jobs"
ON public.unified_tasks
FOR SELECT
TO authenticated
USING (
  job_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.jobs j ON j.company_id = cm.company_id
    WHERE cm.user_id = auth.uid()
    AND j.id = unified_tasks.job_id
  )
);

-- Notification trigger for task assignments
CREATE OR REPLACE FUNCTION public.notify_on_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_job_title TEXT;
  v_job_id UUID;
  v_action_url TEXT;
  v_message TEXT;
BEGIN
  SELECT title, job_id INTO v_task_title, v_job_id
  FROM public.unified_tasks WHERE id = NEW.task_id;

  IF v_job_id IS NOT NULL THEN
    SELECT title INTO v_job_title FROM public.jobs WHERE id = v_job_id;
    v_message := v_task_title || ' (Job: ' || COALESCE(v_job_title, 'Unknown') || ')';
    v_action_url := '/jobs/' || v_job_id || '?tab=tasks';
  ELSE
    v_message := v_task_title;
    v_action_url := '/clubpilot';
  END IF;

  IF NEW.user_id != (SELECT created_by FROM public.unified_tasks WHERE id = NEW.task_id) THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
    VALUES (
      NEW.user_id,
      'You''ve been assigned a task',
      v_message,
      'task_assignment',
      v_action_url,
      jsonb_build_object('task_id', NEW.task_id, 'job_id', v_job_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON public.unified_task_assignees;
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT ON public.unified_task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_assignment();
