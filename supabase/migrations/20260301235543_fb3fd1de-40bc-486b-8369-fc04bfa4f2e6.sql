
-- Create a function that fires when an application's status changes,
-- inserting a notification for the candidate.
CREATE OR REPLACE FUNCTION public.notify_application_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  notif_title text;
  job_title text;
  company text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine the candidate user id
  target_user_id := COALESCE(NEW.user_id, NEW.candidate_id);
  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build a human-readable title
  job_title := COALESCE(NEW.position, 'a role');
  company := COALESCE(NEW.company_name, '');

  notif_title := 'Your application for ' || job_title ||
    CASE WHEN company != '' THEN ' at ' || company ELSE '' END ||
    ' moved to ' || COALESCE(NEW.status, 'a new stage');

  INSERT INTO public.notifications (user_id, type, title, action_url, metadata, is_read, is_archived)
  VALUES (
    target_user_id,
    'application_update',
    notif_title,
    '/applications/' || NEW.id,
    jsonb_build_object(
      'application_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'position', NEW.position,
      'company_name', NEW.company_name
    ),
    false,
    false
  );

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_application_stage_notification ON public.applications;
CREATE TRIGGER trg_application_stage_notification
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_stage_change();
