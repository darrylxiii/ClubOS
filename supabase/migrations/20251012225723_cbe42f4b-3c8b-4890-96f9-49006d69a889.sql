-- Enhance club_objectives table with advanced project management fields
ALTER TABLE public.club_objectives
ADD COLUMN IF NOT EXISTS owners uuid[] DEFAULT ARRAY[]::uuid[],
ADD COLUMN IF NOT EXISTS start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS hard_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS milestone_type text,
ADD COLUMN IF NOT EXISTS goals text,
ADD COLUMN IF NOT EXISTS timeline_notes text,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'company' CHECK (visibility IN ('private', 'team', 'company', 'public'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_objectives_owners ON public.club_objectives USING gin(owners);
CREATE INDEX IF NOT EXISTS idx_objectives_due_date ON public.club_objectives(due_date);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON public.club_objectives(status);

-- Create objective_activities table for audit log
CREATE TABLE IF NOT EXISTS public.objective_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES public.club_objectives(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  activity_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objective_activities_objective ON public.objective_activities(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_activities_created ON public.objective_activities(created_at DESC);

-- Enable RLS on objective_activities
ALTER TABLE public.objective_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for objective_activities
CREATE POLICY "Users can view activities for their objectives"
ON public.objective_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_objectives
    WHERE id = objective_activities.objective_id
    AND (
      created_by = auth.uid()
      OR auth.uid() = ANY(owners)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
    )
  )
);

CREATE POLICY "System can insert activities"
ON public.objective_activities FOR INSERT
WITH CHECK (true);

-- Create objective_comments table
CREATE TABLE IF NOT EXISTS public.objective_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES public.club_objectives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  parent_comment_id uuid REFERENCES public.objective_comments(id) ON DELETE CASCADE,
  mentioned_users uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objective_comments_objective ON public.objective_comments(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_comments_parent ON public.objective_comments(parent_comment_id);

-- Enable RLS on objective_comments
ALTER TABLE public.objective_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for objective_comments
CREATE POLICY "Users can view comments for their objectives"
ON public.objective_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_objectives
    WHERE id = objective_comments.objective_id
    AND (
      created_by = auth.uid()
      OR auth.uid() = ANY(owners)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
    )
  )
);

CREATE POLICY "Users can create comments on their objectives"
ON public.objective_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.club_objectives
    WHERE id = objective_comments.objective_id
    AND (
      created_by = auth.uid()
      OR auth.uid() = ANY(owners)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
    )
  )
);

CREATE POLICY "Users can update their own comments"
ON public.objective_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.objective_comments FOR DELETE
USING (user_id = auth.uid());

-- Update RLS policies for club_objectives to include owners
DROP POLICY IF EXISTS "Authenticated users can view objectives" ON public.club_objectives;
DROP POLICY IF EXISTS "Authenticated users can create objectives" ON public.club_objectives;
DROP POLICY IF EXISTS "Authenticated users can update objectives" ON public.club_objectives;
DROP POLICY IF EXISTS "Creators and admins can delete objectives" ON public.club_objectives;

CREATE POLICY "Users can view their objectives"
ON public.club_objectives FOR SELECT
USING (
  created_by = auth.uid()
  OR auth.uid() = ANY(owners)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'partner'::app_role)
);

CREATE POLICY "Users can create objectives"
ON public.club_objectives FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'partner'::app_role)
);

CREATE POLICY "Owners and admins can update objectives"
ON public.club_objectives FOR UPDATE
USING (
  created_by = auth.uid()
  OR auth.uid() = ANY(owners)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'partner'::app_role)
);

CREATE POLICY "Creators and admins can delete objectives"
ON public.club_objectives FOR DELETE
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Function to calculate objective completion based on child tasks
CREATE OR REPLACE FUNCTION calculate_objective_completion(objective_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_tasks integer;
  completed_tasks integer;
  completion_pct integer;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM unified_tasks
  WHERE objective_id = objective_uuid;
  
  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;
  
  completion_pct := ROUND((completed_tasks::numeric / total_tasks::numeric) * 100);
  
  UPDATE club_objectives
  SET completion_percentage = completion_pct
  WHERE id = objective_uuid;
  
  RETURN completion_pct;
END;
$$;

-- Trigger to update objective completion when tasks change
CREATE OR REPLACE FUNCTION update_objective_completion_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.objective_id IS NOT NULL THEN
      PERFORM calculate_objective_completion(OLD.objective_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.objective_id IS NOT NULL THEN
      PERFORM calculate_objective_completion(NEW.objective_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_objective_completion ON public.unified_tasks;
CREATE TRIGGER trigger_update_objective_completion
AFTER INSERT OR UPDATE OF status OR DELETE ON public.unified_tasks
FOR EACH ROW
EXECUTE FUNCTION update_objective_completion_trigger();