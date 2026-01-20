-- Drop existing time_entries table and recreate with proper schema
-- First backup any existing data (if needed)

-- Create projects table for time tracking
CREATE TABLE IF NOT EXISTS public.tracking_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  budget_hours NUMERIC(10, 2),
  hourly_rate NUMERIC(10, 2),
  client_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_billable_default BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tasks table linked to projects
CREATE TABLE IF NOT EXISTS public.tracking_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.tracking_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_hours NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recreate time_entries with proper enterprise schema
DROP TABLE IF EXISTS public.time_entries CASCADE;

CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.tracking_projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tracking_tasks(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_running BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  is_billable BOOLEAN NOT NULL DEFAULT true,
  activity_level TEXT DEFAULT 'active',
  idle_seconds INTEGER DEFAULT 0,
  source TEXT DEFAULT 'timer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (duration_seconds >= 0),
  CONSTRAINT valid_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

-- User timer settings for idle detection thresholds
CREATE TABLE IF NOT EXISTS public.user_timer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  idle_threshold_minutes INTEGER NOT NULL DEFAULT 5,
  auto_stop_on_idle BOOLEAN NOT NULL DEFAULT false,
  default_project_id UUID REFERENCES public.tracking_projects(id) ON DELETE SET NULL,
  show_running_timer_header BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timer_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracking_projects
CREATE POLICY "Users can view all active projects"
  ON public.tracking_projects FOR SELECT
  USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Users can create projects"
  ON public.tracking_projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own projects"
  ON public.tracking_projects FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for tracking_tasks
CREATE POLICY "Users can view tasks"
  ON public.tracking_tasks FOR SELECT
  USING (true);

CREATE POLICY "Users can create tasks"
  ON public.tracking_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tasks"
  ON public.tracking_tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own entries"
  ON public.time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own entries"
  ON public.time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own entries"
  ON public.time_entries FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for user_timer_settings
CREATE POLICY "Users can manage their own settings"
  ON public.user_timer_settings FOR ALL
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_is_running ON public.time_entries(is_running) WHERE is_running = true;
CREATE INDEX idx_time_entries_start_time ON public.time_entries(start_time DESC);
CREATE INDEX idx_tracking_tasks_project_id ON public.tracking_tasks(project_id);

-- Enable realtime for time_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;

-- Insert some default projects
INSERT INTO public.tracking_projects (name, color, description, is_billable_default) VALUES
  ('General', '#6b7280', 'General work and miscellaneous tasks', true),
  ('Development', '#3b82f6', 'Software development and coding', true),
  ('Meetings', '#8b5cf6', 'Team meetings and client calls', true),
  ('Research', '#10b981', 'Research and learning', false),
  ('Admin', '#f59e0b', 'Administrative tasks', false)
ON CONFLICT DO NOTHING;

-- Function to ensure only one running timer per user
CREATE OR REPLACE FUNCTION ensure_single_running_timer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_running = true THEN
    -- Stop any other running timers for this user
    UPDATE public.time_entries
    SET 
      is_running = false,
      end_time = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - start_time))::INTEGER,
      updated_at = now()
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_running = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_timer_trigger
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_running_timer();

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entries_updated_at();