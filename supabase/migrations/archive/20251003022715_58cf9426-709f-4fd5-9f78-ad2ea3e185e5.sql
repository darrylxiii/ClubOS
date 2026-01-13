-- Create tasks table for pipeline activities
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('interview_prep', 'application', 'follow_up', 'research', 'meeting', 'custom')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER DEFAULT 30,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  company_name TEXT,
  position TEXT,
  application_id TEXT,
  auto_scheduled BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create task scheduling preferences table
CREATE TABLE public.task_scheduling_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_schedule_enabled BOOLEAN DEFAULT false,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '17:00',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Monday to Friday
  preferred_task_duration_minutes INTEGER DEFAULT 30,
  break_between_tasks_minutes INTEGER DEFAULT 15,
  max_tasks_per_day INTEGER DEFAULT 8,
  focus_time_blocks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Users can view their own tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on task_scheduling_preferences table
ALTER TABLE public.task_scheduling_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for task_scheduling_preferences
CREATE POLICY "Users can view their own preferences"
ON public.task_scheduling_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.task_scheduling_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.task_scheduling_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_scheduling_preferences_updated_at
BEFORE UPDATE ON public.task_scheduling_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_scheduled ON public.tasks(scheduled_start, scheduled_end);