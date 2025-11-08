-- Fix log_activity() function to handle standalone candidates
-- Only log to activity_timeline when there's an actual user_id (not just candidate_id)
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Log application activities ONLY if there's a user_id
  -- Skip for standalone candidates (user_id IS NULL)
  IF TG_TABLE_NAME = 'applications' AND NEW.user_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO activity_timeline (user_id, activity_type, activity_data)
      VALUES (
        NEW.user_id,  -- Use user_id instead of candidate_id
        'application_submitted',
        jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id)
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.current_stage_index != NEW.current_stage_index THEN
      INSERT INTO activity_timeline (user_id, activity_type, activity_data)
      VALUES (
        NEW.user_id,  -- Use user_id instead of candidate_id
        'application_stage_changed',
        jsonb_build_object(
          'job_id', NEW.job_id, 
          'application_id', NEW.id, 
          'old_stage_index', OLD.current_stage_index, 
          'new_stage_index', NEW.current_stage_index
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;