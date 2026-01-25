
-- Fix log_user_activity() to handle standalone candidates properly
-- The issue: It uses candidate_id which is a candidate_profiles.id, NOT an auth user id
-- The activity_timeline.user_id references auth.users, so we can't use candidate_id directly

CREATE OR REPLACE FUNCTION public.log_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
  activity_type_name TEXT;
  activity_data JSONB;
BEGIN
  -- Determine user_id based on table
  IF TG_TABLE_NAME = 'applications' THEN
    -- FIX: For applications, we need to get the user_id from the application,
    -- NOT the candidate_id (which is a candidate_profiles.id, not an auth user)
    -- Only log activity if the application has a user_id (linked to an auth user)
    target_user_id := NEW.user_id;
    
    -- Skip logging for standalone candidates (no auth user)
    IF target_user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    activity_type_name := CASE 
      WHEN TG_OP = 'INSERT' THEN 'application_submitted'
      WHEN TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN 'application_status_changed'
      ELSE NULL
    END;
    activity_data := jsonb_build_object(
      'job_id', NEW.job_id,
      'status', NEW.status,
      'action', TG_OP,
      'candidate_id', NEW.candidate_id
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
    -- For bookings, use user_id (host) since candidate_id may not be an auth user
    target_user_id := NEW.user_id;
    
    activity_type_name := CASE 
      WHEN TG_OP = 'INSERT' THEN 
        CASE WHEN NEW.candidate_id IS NOT NULL THEN 'interview_scheduled' ELSE 'booking_created' END
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN 'interview_completed'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN 'booking_cancelled'
      ELSE NULL
    END;
    
    activity_data := jsonb_build_object(
      'booking_id', NEW.id,
      'scheduled_start', NEW.scheduled_start,
      'scheduled_end', NEW.scheduled_end,
      'status', NEW.status,
      'guest_name', NEW.guest_name,
      'candidate_id', NEW.candidate_id
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
$function$;
