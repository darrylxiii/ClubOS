-- ========================================
-- UNIFIED TASKS SYSTEM MIGRATION
-- Preserves legacy Club Tasks and Task Pilot
-- ========================================

-- Create unified tasks table (merges both systems)
CREATE TABLE IF NOT EXISTS public.unified_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core task fields
  task_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Status and priority
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  
  -- Dates and scheduling
  due_date TIMESTAMP WITH TIME ZONE,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER DEFAULT 30,
  
  -- AI scheduling
  auto_scheduled BOOLEAN DEFAULT false,
  scheduling_mode TEXT DEFAULT 'manual', -- 'manual', 'ai', 'hybrid'
  ai_confidence_score NUMERIC,
  
  -- Assignment
  objective_id UUID REFERENCES public.club_objectives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task metadata
  task_type TEXT DEFAULT 'general',
  company_name TEXT,
  position TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Tracking
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Migration tracking
  legacy_club_task_id UUID,
  legacy_pilot_task_id UUID,
  migration_status TEXT DEFAULT 'new' -- 'new', 'migrated_from_club', 'migrated_from_pilot', 'merged'
);

-- Create unified task assignees table
CREATE TABLE IF NOT EXISTS public.unified_task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'assignee', -- 'assignee', 'owner', 'reviewer'
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Create unified task blockers table
CREATE TABLE IF NOT EXISTS public.unified_task_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_task_id UUID NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  blocking_task_id UUID NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(blocked_task_id, blocking_task_id)
);

-- Create migration log table
CREATE TABLE IF NOT EXISTS public.task_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_type TEXT NOT NULL, -- 'club_to_unified', 'pilot_to_unified'
  source_task_id UUID NOT NULL,
  target_task_id UUID REFERENCES public.unified_tasks(id),
  migration_status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'rolled_back'
  migration_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  migrated_by UUID REFERENCES auth.users(id),
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rolled_back_at TIMESTAMP WITH TIME ZONE
);

-- Create system preferences table for admin controls
CREATE TABLE IF NOT EXISTS public.task_system_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  active_system TEXT NOT NULL DEFAULT 'unified', -- 'legacy_club', 'legacy_pilot', 'unified', 'side_by_side'
  show_migration_banner BOOLEAN DEFAULT true,
  ai_scheduling_enabled BOOLEAN DEFAULT true,
  working_hours_start TEXT DEFAULT '09:00',
  working_hours_end TEXT DEFAULT '17:00',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Sunday, 6=Saturday
  max_tasks_per_day INTEGER DEFAULT 8,
  buffer_between_tasks_minutes INTEGER DEFAULT 15,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.unified_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_task_blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_system_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unified_tasks
CREATE POLICY "Users can view their own unified tasks"
  ON public.unified_tasks FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.unified_task_assignees 
      WHERE task_id = unified_tasks.id AND user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can create unified tasks"
  ON public.unified_tasks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() = created_by
  );

CREATE POLICY "Users can update their unified tasks"
  ON public.unified_tasks FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.unified_task_assignees 
      WHERE task_id = unified_tasks.id AND user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can delete their unified tasks"
  ON public.unified_tasks FOR DELETE
  USING (
    auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for unified_task_assignees
CREATE POLICY "Users can view task assignees"
  ON public.unified_task_assignees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_tasks 
      WHERE id = unified_task_assignees.task_id 
      AND (user_id = auth.uid() OR created_by = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can manage task assignees"
  ON public.unified_task_assignees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_tasks 
      WHERE id = unified_task_assignees.task_id 
      AND created_by = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for unified_task_blockers
CREATE POLICY "Users can view task blockers"
  ON public.unified_task_blockers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_tasks 
      WHERE id = unified_task_blockers.blocked_task_id 
      AND (user_id = auth.uid() OR created_by = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can manage task blockers"
  ON public.unified_task_blockers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_tasks 
      WHERE id = unified_task_blockers.blocked_task_id 
      AND created_by = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for task_migration_log
CREATE POLICY "Admins can view migration logs"
  ON public.task_migration_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create migration logs"
  ON public.task_migration_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for task_system_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.task_system_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
  ON public.task_system_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Function to generate unified task number
CREATE OR REPLACE FUNCTION public.generate_unified_task_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  new_task_number TEXT;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(task_number FROM 4) AS INTEGER)), 
    0
  ) + 1 INTO next_number
  FROM unified_tasks
  WHERE task_number ~ '^UT-[0-9]+$';
  
  new_task_number := 'UT-' || next_number;
  RETURN new_task_number;
END;
$$;

-- Trigger to auto-generate task number
CREATE OR REPLACE FUNCTION public.set_unified_task_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.task_number IS NULL OR NEW.task_number = '' THEN
    NEW.task_number := generate_unified_task_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_unified_task_number_trigger
  BEFORE INSERT ON public.unified_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_unified_task_number();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_unified_tasks_updated_at
  BEFORE UPDATE ON public.unified_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_system_preferences_updated_at
  BEFORE UPDATE ON public.task_system_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_unified_tasks_user_id ON public.unified_tasks(user_id);
CREATE INDEX idx_unified_tasks_objective_id ON public.unified_tasks(objective_id);
CREATE INDEX idx_unified_tasks_status ON public.unified_tasks(status);
CREATE INDEX idx_unified_tasks_scheduled_start ON public.unified_tasks(scheduled_start);
CREATE INDEX idx_unified_tasks_due_date ON public.unified_tasks(due_date);
CREATE INDEX idx_unified_tasks_migration_status ON public.unified_tasks(migration_status);
CREATE INDEX idx_unified_task_assignees_task_id ON public.unified_task_assignees(task_id);
CREATE INDEX idx_unified_task_assignees_user_id ON public.unified_task_assignees(user_id);
CREATE INDEX idx_task_migration_log_source_task_id ON public.task_migration_log(source_task_id);
CREATE INDEX idx_task_system_preferences_user_id ON public.task_system_preferences(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.unified_tasks IS 'Unified task system merging Club Tasks and Task Pilot features. Preserves legacy data through migration tracking.';
COMMENT ON TABLE public.task_migration_log IS 'Tracks all migrations from legacy systems to unified system for audit and rollback capabilities.';
COMMENT ON TABLE public.task_system_preferences IS 'User preferences for task system view and AI scheduling configuration.';
COMMENT ON COLUMN public.unified_tasks.migration_status IS 'Tracks origin: new, migrated_from_club, migrated_from_pilot, merged';
COMMENT ON COLUMN public.unified_tasks.scheduling_mode IS 'Task scheduling mode: manual, ai, or hybrid';
COMMENT ON COLUMN public.task_system_preferences.active_system IS 'Which task system view is active: legacy_club, legacy_pilot, unified, side_by_side';