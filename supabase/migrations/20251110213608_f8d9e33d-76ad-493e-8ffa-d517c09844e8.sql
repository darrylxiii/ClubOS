-- Create the track_user_event RPC function for activity tracking
CREATE OR REPLACE FUNCTION public.track_user_event(
  p_user_id UUID,
  p_session_id TEXT,
  p_event_type TEXT,
  p_event_category TEXT DEFAULT NULL,
  p_action_data JSONB DEFAULT '{}'::jsonb,
  p_page_path TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert event into user_activity_events
  INSERT INTO public.user_activity_events (
    user_id,
    session_id,
    event_type,
    event_category,
    action_data,
    page_path,
    referrer,
    device_type,
    duration_seconds
  ) VALUES (
    p_user_id,
    p_session_id,
    p_event_type,
    p_event_category,
    p_action_data,
    p_page_path,
    p_referrer,
    p_device_type,
    p_duration_seconds
  );

  -- Update last_activity_at in user_activity_tracking
  UPDATE public.user_activity_tracking
  SET last_activity_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't crash - return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;