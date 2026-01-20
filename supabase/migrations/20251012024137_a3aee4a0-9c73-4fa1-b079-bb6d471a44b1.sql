-- Create club_objectives table
CREATE TABLE public.club_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'on_hold', 'completed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create club_tasks table
CREATE TABLE public.club_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number TEXT UNIQUE NOT NULL,
  objective_id UUID REFERENCES public.club_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('blocked', 'parking_lot', 'to_do', 'in_progress', 'on_hold', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create task_assignees table (for multiple team members per task)
CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.club_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Create task_blockers table (for blocking relationships)
CREATE TABLE public.task_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_task_id UUID REFERENCES public.club_tasks(id) ON DELETE CASCADE NOT NULL,
  blocking_task_id UUID REFERENCES public.club_tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(blocked_task_id, blocking_task_id),
  CHECK (blocked_task_id != blocking_task_id)
);

-- Create indexes for performance
CREATE INDEX idx_club_tasks_objective_id ON public.club_tasks(objective_id);
CREATE INDEX idx_club_tasks_status ON public.club_tasks(status);
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX idx_task_blockers_blocked ON public.task_blockers(blocked_task_id);
CREATE INDEX idx_task_blockers_blocking ON public.task_blockers(blocking_task_id);

-- Function to generate task numbers
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  new_task_number TEXT;
BEGIN
  -- Get the highest existing task number
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(task_number FROM 4) AS INTEGER)), 
    0
  ) + 1 INTO next_number
  FROM club_tasks
  WHERE task_number ~ '^QT-[0-9]+$';
  
  new_task_number := 'QT-' || next_number;
  RETURN new_task_number;
END;
$$;

-- Trigger to auto-generate task numbers
CREATE OR REPLACE FUNCTION set_task_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.task_number IS NULL OR NEW.task_number = '' THEN
    NEW.task_number := generate_task_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_task_number
BEFORE INSERT ON public.club_tasks
FOR EACH ROW
EXECUTE FUNCTION set_task_number();

-- Trigger to update updated_at
CREATE TRIGGER update_club_objectives_updated_at
BEFORE UPDATE ON public.club_objectives
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_tasks_updated_at
BEFORE UPDATE ON public.club_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.club_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_blockers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for club_objectives
CREATE POLICY "Authenticated users can view objectives"
ON public.club_objectives FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create objectives"
ON public.club_objectives FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update objectives"
ON public.club_objectives FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Creators and admins can delete objectives"
ON public.club_objectives FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for club_tasks
CREATE POLICY "Authenticated users can view tasks"
ON public.club_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tasks"
ON public.club_tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update tasks"
ON public.club_tasks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Creators and admins can delete tasks"
ON public.club_tasks FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for task_assignees
CREATE POLICY "Authenticated users can view assignees"
ON public.task_assignees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create assignees"
ON public.task_assignees FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assignees"
ON public.task_assignees FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for task_blockers
CREATE POLICY "Authenticated users can view blockers"
ON public.task_blockers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create blockers"
ON public.task_blockers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blockers"
ON public.task_blockers FOR DELETE
TO authenticated
USING (true);