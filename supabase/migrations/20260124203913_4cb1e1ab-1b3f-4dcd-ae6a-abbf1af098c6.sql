-- Fix log_user_activity() function for bookings table
-- Fixes: 1) Wrong column name (scheduled_at -> scheduled_start)
--        2) NULL candidate_id fallback to user_id
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
    -- FIX 1: Use candidate_id if available, otherwise fall back to user_id (host)
    target_user_id := COALESCE(NEW.candidate_id, NEW.user_id);
    
    activity_type_name := CASE 
      WHEN TG_OP = 'INSERT' THEN 
        CASE WHEN NEW.candidate_id IS NOT NULL THEN 'interview_scheduled' ELSE 'booking_created' END
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN 'interview_completed'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN 'booking_cancelled'
      ELSE NULL
    END;
    
    -- FIX 2: Use scheduled_start instead of scheduled_at
    activity_data := jsonb_build_object(
      'booking_id', NEW.id,
      'scheduled_start', NEW.scheduled_start,
      'scheduled_end', NEW.scheduled_end,
      'status', NEW.status,
      'guest_name', NEW.guest_name
    );
  ELSIF TG_TABLE_NAME = 'milestone_comments' THEN
    target_user_id := NEW.user_id;
    activity_type_name := 'comment_added';
    activity_data := jsonb_build_object(
      'milestone_id', NEW.milestone_id,
      'comment_id', NEW.id
    );
  END IF;

  -- Only insert if we have a valid activity type AND user_id
  IF activity_type_name IS NOT NULL AND target_user_id IS NOT NULL THEN
    INSERT INTO public.activity_timeline (user_id, activity_type, activity_data, created_at)
    VALUES (target_user_id, activity_type_name, activity_data, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;