-- Profile Strength/Setup Manager System
-- Tracks user progress through onboarding and feature adoption

CREATE TABLE IF NOT EXISTS public.profile_strength_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_key text NOT NULL,
  task_level integer NOT NULL CHECK (task_level BETWEEN 1 AND 5),
  role app_role NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  skipped boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, task_key, role)
);

CREATE TABLE IF NOT EXISTS public.profile_strength_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role app_role NOT NULL,
  current_level integer DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  total_tasks integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  completion_percentage numeric DEFAULT 0,
  level_1_completed boolean DEFAULT false,
  level_2_completed boolean DEFAULT false,
  level_3_completed boolean DEFAULT false,
  level_4_completed boolean DEFAULT false,
  level_5_completed boolean DEFAULT false,
  all_levels_completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_strength_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_strength_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.profile_strength_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.profile_strength_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.profile_strength_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks"
  ON public.profile_strength_tasks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for stats
CREATE POLICY "Users can view their own stats"
  ON public.profile_strength_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.profile_strength_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public.profile_strength_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all stats"
  ON public.profile_strength_stats FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update profile strength stats
CREATE OR REPLACE FUNCTION update_profile_strength_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count integer;
  completed_count integer;
  completion_pct numeric;
  level_1_done boolean;
  level_2_done boolean;
  level_3_done boolean;
  level_4_done boolean;
  level_5_done boolean;
  new_current_level integer;
BEGIN
  -- Count tasks
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true)
  INTO total_count, completed_count
  FROM profile_strength_tasks
  WHERE user_id = NEW.user_id AND role = NEW.role;

  -- Calculate percentage
  completion_pct := CASE 
    WHEN total_count > 0 THEN (completed_count::numeric / total_count::numeric) * 100
    ELSE 0
  END;

  -- Check level completion
  SELECT 
    COUNT(*) FILTER (WHERE task_level = 1 AND NOT completed) = 0,
    COUNT(*) FILTER (WHERE task_level = 2 AND NOT completed) = 0,
    COUNT(*) FILTER (WHERE task_level = 3 AND NOT completed) = 0,
    COUNT(*) FILTER (WHERE task_level = 4 AND NOT completed) = 0,
    COUNT(*) FILTER (WHERE task_level = 5 AND NOT completed) = 0
  INTO level_1_done, level_2_done, level_3_done, level_4_done, level_5_done
  FROM profile_strength_tasks
  WHERE user_id = NEW.user_id AND role = NEW.role;

  -- Determine current level
  new_current_level := CASE
    WHEN NOT level_1_done THEN 1
    WHEN NOT level_2_done THEN 2
    WHEN NOT level_3_done THEN 3
    WHEN NOT level_4_done THEN 4
    WHEN NOT level_5_done THEN 5
    ELSE 5
  END;

  -- Upsert stats
  INSERT INTO profile_strength_stats (
    user_id,
    role,
    current_level,
    total_tasks,
    completed_tasks,
    completion_percentage,
    level_1_completed,
    level_2_completed,
    level_3_completed,
    level_4_completed,
    level_5_completed,
    all_levels_completed_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    NEW.role,
    new_current_level,
    total_count,
    completed_count,
    completion_pct,
    level_1_done,
    level_2_done,
    level_3_done,
    level_4_done,
    level_5_done,
    CASE WHEN level_1_done AND level_2_done AND level_3_done AND level_4_done AND level_5_done 
      THEN now() 
      ELSE NULL 
    END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_level = new_current_level,
    total_tasks = total_count,
    completed_tasks = completed_count,
    completion_percentage = completion_pct,
    level_1_completed = level_1_done,
    level_2_completed = level_2_done,
    level_3_completed = level_3_done,
    level_4_completed = level_4_done,
    level_5_completed = level_5_done,
    all_levels_completed_at = CASE 
      WHEN level_1_done AND level_2_done AND level_3_done AND level_4_done AND level_5_done 
        AND profile_strength_stats.all_levels_completed_at IS NULL
      THEN now() 
      ELSE profile_strength_stats.all_levels_completed_at
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Trigger to update stats
CREATE TRIGGER update_profile_strength_stats_trigger
  AFTER INSERT OR UPDATE ON profile_strength_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_strength_stats();

-- Indexes for performance
CREATE INDEX idx_profile_strength_tasks_user_role ON profile_strength_tasks(user_id, role);
CREATE INDEX idx_profile_strength_tasks_level ON profile_strength_tasks(task_level);
CREATE INDEX idx_profile_strength_stats_user ON profile_strength_stats(user_id);