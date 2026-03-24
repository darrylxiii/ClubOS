
CREATE OR REPLACE FUNCTION public.update_user_activity_tracking(
  p_user_id UUID,
  p_action_type TEXT DEFAULT NULL,
  p_increment_actions BOOLEAN DEFAULT FALSE,
  p_session_id TEXT DEFAULT NULL,
  p_is_login BOOLEAN DEFAULT FALSE,
  p_is_logout BOOLEAN DEFAULT FALSE,
  p_session_duration_minutes INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity_tracking (
    user_id,
    last_activity_at,
    last_login_at,
    total_actions,
    session_count,
    total_session_duration_minutes,
    status
  ) VALUES (
    p_user_id,
    NOW(),
    CASE WHEN p_is_login THEN NOW() ELSE NULL END,
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
    last_login_at = CASE WHEN p_is_login THEN NOW() ELSE user_activity_tracking.last_login_at END,
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
$$;
