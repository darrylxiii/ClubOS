-- Fix update_user_activity_tracking function overload conflict
-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.update_user_activity_tracking(uuid, text, boolean, text, boolean, boolean, integer);
DROP FUNCTION IF EXISTS public.update_user_activity_tracking(uuid, text, boolean, uuid, boolean, boolean, integer);

-- Recreate the function with TEXT session_id (correct version)
CREATE OR REPLACE FUNCTION public.update_user_activity_tracking(
  p_user_id uuid,
  p_action_type text,
  p_increment_actions boolean DEFAULT true,
  p_session_id text DEFAULT NULL,
  p_is_login boolean DEFAULT false,
  p_is_logout boolean DEFAULT false,
  p_session_duration_minutes integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_activity_tracking (
    user_id,
    last_activity_at,
    total_actions,
    session_count,
    total_session_duration_minutes,
    status
  ) VALUES (
    p_user_id,
    NOW(),
    CASE WHEN p_increment_actions THEN 1 ELSE 0 END,
    CASE WHEN p_is_login THEN 1 ELSE 0 END,
    COALESCE(p_session_duration_minutes, 0),
    CASE 
      WHEN p_is_logout THEN 'offline'
      ELSE 'online'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_activity_at = NOW(),
    total_actions = user_activity_tracking.total_actions + CASE WHEN p_increment_actions THEN 1 ELSE 0 END,
    session_count = user_activity_tracking.session_count + CASE WHEN p_is_login THEN 1 ELSE 0 END,
    total_session_duration_minutes = user_activity_tracking.total_session_duration_minutes + COALESCE(p_session_duration_minutes, 0),
    status = CASE 
      WHEN p_is_logout THEN 'offline'
      WHEN p_is_login THEN 'online'
      ELSE user_activity_tracking.status
    END,
    updated_at = NOW();
END;
$function$;