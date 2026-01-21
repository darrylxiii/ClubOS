-- =====================================================
-- QUICK WINS: Database Setup (Fixed)
-- =====================================================

-- 1. Create milestone_comments table for contract discussions
CREATE TABLE IF NOT EXISTS public.milestone_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.milestone_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on milestones in contracts they're part of
CREATE POLICY "Users can view comments on their contracts" 
ON public.milestone_comments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM project_milestones pm
    JOIN project_contracts pc ON pm.contract_id = pc.id
    WHERE pm.id = milestone_id
    AND (pc.client_id = auth.uid() OR pc.freelancer_id = auth.uid())
  )
);

-- Policy: Users can insert their own comments
CREATE POLICY "Users can add comments" 
ON public.milestone_comments FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments" 
ON public.milestone_comments FOR UPDATE 
USING (user_id = auth.uid());

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments" 
ON public.milestone_comments FOR DELETE 
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_milestone_comments_milestone_id 
ON public.milestone_comments(milestone_id);

CREATE INDEX IF NOT EXISTS idx_milestone_comments_user_id 
ON public.milestone_comments(user_id);

-- Enable realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestone_comments;

-- 2. Add shared_link_token to assessment_results for sharing feature
ALTER TABLE public.assessment_results 
ADD COLUMN IF NOT EXISTS shared_link_token UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_assessment_results_shared_token 
ON public.assessment_results(shared_link_token) 
WHERE shared_link_token IS NOT NULL;

-- 3. Create function to auto-populate activity_timeline from key events
CREATE OR REPLACE FUNCTION public.log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  activity_type_name TEXT;
  activity_data JSONB;
BEGIN
  -- Determine user_id based on table
  IF TG_TABLE_NAME = 'applications' THEN
    target_user_id := NEW.candidate_id;
    activity_type_name := CASE 
      WHEN TG_OP = 'INSERT' THEN 'application_submitted'
      WHEN TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN 'application_status_changed'
      ELSE NULL
    END;
    activity_data := jsonb_build_object(
      'job_id', NEW.job_id,
      'status', NEW.status,
      'action', TG_OP
    );
  ELSIF TG_TABLE_NAME = 'assessment_results' THEN
    target_user_id := NEW.user_id;
    activity_type_name := 'assessment_completed';
    activity_data := jsonb_build_object(
      'assessment_id', NEW.assessment_id,
      'assessment_name', NEW.assessment_name,
      'score', NEW.score
    );
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    target_user_id := NEW.candidate_id;
    activity_type_name := CASE 
      WHEN TG_OP = 'INSERT' THEN 'interview_scheduled'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN 'interview_completed'
      ELSE NULL
    END;
    activity_data := jsonb_build_object(
      'booking_id', NEW.id,
      'scheduled_at', NEW.scheduled_at,
      'status', NEW.status
    );
  ELSIF TG_TABLE_NAME = 'milestone_comments' THEN
    target_user_id := NEW.user_id;
    activity_type_name := 'comment_added';
    activity_data := jsonb_build_object(
      'milestone_id', NEW.milestone_id,
      'comment_id', NEW.id
    );
  END IF;

  -- Only insert if we have a valid activity type
  IF activity_type_name IS NOT NULL AND target_user_id IS NOT NULL THEN
    INSERT INTO public.activity_timeline (user_id, activity_type, activity_data, created_at)
    VALUES (target_user_id, activity_type_name, activity_data, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create triggers for activity logging (only for existing tables)
-- Applications trigger
DROP TRIGGER IF EXISTS trg_activity_applications ON public.applications;
CREATE TRIGGER trg_activity_applications
AFTER INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION log_user_activity();

-- Assessment results trigger
DROP TRIGGER IF EXISTS trg_activity_assessments ON public.assessment_results;
CREATE TRIGGER trg_activity_assessments
AFTER INSERT ON public.assessment_results
FOR EACH ROW EXECUTE FUNCTION log_user_activity();

-- Bookings trigger
DROP TRIGGER IF EXISTS trg_activity_bookings ON public.bookings;
CREATE TRIGGER trg_activity_bookings
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION log_user_activity();

-- Milestone comments trigger
DROP TRIGGER IF EXISTS trg_activity_milestone_comments ON public.milestone_comments;
CREATE TRIGGER trg_activity_milestone_comments
AFTER INSERT ON public.milestone_comments
FOR EACH ROW EXECUTE FUNCTION log_user_activity();