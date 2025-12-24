-- Phase 3: Add recurring tasks and activity log
-- Add recurring task columns
ALTER TABLE public.unified_tasks ADD COLUMN IF NOT EXISTS recurrence_rule jsonb;
ALTER TABLE public.unified_tasks ADD COLUMN IF NOT EXISTS recurrence_end_date timestamp with time zone;
ALTER TABLE public.unified_tasks ADD COLUMN IF NOT EXISTS next_occurrence date;
ALTER TABLE public.unified_tasks ADD COLUMN IF NOT EXISTS parent_recurring_id uuid REFERENCES public.unified_tasks(id);
ALTER TABLE public.unified_tasks ADD COLUMN IF NOT EXISTS is_overdue boolean DEFAULT false;
ALTER TABLE public.unified_tasks ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now();

-- Create task activity log table
CREATE TABLE IF NOT EXISTS public.task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_activity_log
CREATE POLICY "Users can view activity for accessible tasks" ON public.task_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.unified_tasks t
      WHERE t.id = task_activity_log.task_id
      AND (t.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.unified_task_assignees a WHERE a.task_id = t.id AND a.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create activity logs" ON public.task_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create custom labels table
CREATE TABLE IF NOT EXISTS public.task_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own labels" ON public.task_labels
  FOR ALL USING (auth.uid() = user_id);

-- Create task-label junction table
CREATE TABLE IF NOT EXISTS public.task_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(task_id, label_id)
);

ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage label assignments for their tasks" ON public.task_label_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.unified_tasks t
      WHERE t.id = task_label_assignments.task_id
      AND (t.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.unified_task_assignees a WHERE a.task_id = t.id AND a.user_id = auth.uid()
      ))
    )
  );

-- Create task reminders table
CREATE TABLE IF NOT EXISTS public.task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  remind_at timestamp with time zone NOT NULL,
  reminder_type text NOT NULL DEFAULT 'due_date',
  is_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reminders" ON public.task_reminders
  FOR ALL USING (auth.uid() = user_id);

-- Create index for overdue task queries
CREATE INDEX IF NOT EXISTS idx_unified_tasks_due_date ON public.unified_tasks(due_date) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_unified_tasks_overdue ON public.unified_tasks(is_overdue) WHERE is_overdue = true;
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id ON public.task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_remind_at ON public.task_reminders(remind_at) WHERE is_sent = false;

-- Function to update is_overdue flag
CREATE OR REPLACE FUNCTION update_task_overdue_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE unified_tasks
  SET is_overdue = true
  WHERE due_date < CURRENT_DATE
    AND status NOT IN ('completed', 'on_hold')
    AND is_overdue = false;
    
  UPDATE unified_tasks
  SET is_overdue = false
  WHERE (due_date >= CURRENT_DATE OR status IN ('completed', 'on_hold'))
    AND is_overdue = true;
END;
$$;