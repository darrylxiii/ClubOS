-- Fix security warnings: Add search_path to functions

-- Fix: calculate_user_engagement_score
DROP FUNCTION IF EXISTS public.calculate_user_engagement_score(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.calculate_user_engagement_score(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS NUMERIC 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score NUMERIC := 0;
  v_sessions INTEGER;
  v_avg_time NUMERIC;
  v_interactions INTEGER;
  v_engaged_pages INTEGER;
BEGIN
  -- Session frequency (0-30 points)
  SELECT COUNT(DISTINCT session_id) INTO v_sessions
  FROM user_page_analytics
  WHERE user_id = p_user_id
    AND entry_timestamp > NOW() - (p_days || ' days')::INTERVAL;
  v_score := v_score + LEAST(v_sessions * 2, 30);

  -- Average time per session (0-25 points)
  SELECT AVG(time_on_page_seconds) INTO v_avg_time
  FROM user_page_analytics
  WHERE user_id = p_user_id
    AND entry_timestamp > NOW() - (p_days || ' days')::INTERVAL;
  v_score := v_score + LEAST(COALESCE(v_avg_time, 0) / 10, 25);

  -- Interaction count (0-25 points)
  SELECT COUNT(*) INTO v_interactions
  FROM user_session_events
  WHERE user_id = p_user_id
    AND event_timestamp > NOW() - (p_days || ' days')::INTERVAL
    AND event_type IN ('click', 'form_interaction', 'navigation');
  v_score := v_score + LEAST(v_interactions / 10, 25);

  -- Engaged pages (0-20 points)
  SELECT COUNT(*) INTO v_engaged_pages
  FROM user_page_analytics
  WHERE user_id = p_user_id
    AND entry_timestamp > NOW() - (p_days || ' days')::INTERVAL
    AND engaged = true;
  v_score := v_score + LEAST(v_engaged_pages * 2, 20);

  RETURN LEAST(v_score, 100);
END;
$$;

-- Fix: detect_churn_risk
DROP FUNCTION IF EXISTS public.detect_churn_risk(UUID);
CREATE OR REPLACE FUNCTION public.detect_churn_risk(
  p_user_id UUID
)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_activity TIMESTAMPTZ;
  v_recent_engagement NUMERIC;
  v_frustration_count INTEGER;
BEGIN
  -- Get last activity
  SELECT MAX(last_activity_at) INTO v_last_activity
  FROM user_activity_tracking
  WHERE user_id = p_user_id;

  -- No activity = high risk
  IF v_last_activity IS NULL OR v_last_activity < NOW() - INTERVAL '30 days' THEN
    RETURN 'high';
  END IF;

  -- Calculate recent engagement
  v_recent_engagement := calculate_user_engagement_score(p_user_id, 7);

  -- Check frustration signals
  SELECT COUNT(*) INTO v_frustration_count
  FROM user_frustration_signals
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '7 days';

  -- Risk logic
  IF v_last_activity < NOW() - INTERVAL '14 days' 
     OR v_recent_engagement < 20 
     OR v_frustration_count > 10 THEN
    RETURN 'high';
  ELSIF v_last_activity < NOW() - INTERVAL '7 days' 
        OR v_recent_engagement < 40 
        OR v_frustration_count > 5 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$;

-- Fix: calculate_partner_health_score
DROP FUNCTION IF EXISTS public.calculate_partner_health_score(UUID);
CREATE OR REPLACE FUNCTION public.calculate_partner_health_score(
  p_partner_id UUID
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_metrics RECORD;
  v_health_score NUMERIC := 0;
BEGIN
  -- Get last 30 days metrics
  SELECT 
    SUM(total_logins) as logins,
    SUM(total_session_time_minutes) as session_time,
    SUM(candidates_viewed) as candidates_viewed,
    SUM(messages_sent) as messages_sent,
    SUM(pipeline_updates) as pipeline_updates,
    AVG(average_response_time_hours) as avg_response_time
  INTO v_metrics
  FROM partner_engagement_metrics
  WHERE partner_id = p_partner_id
    AND date > CURRENT_DATE - INTERVAL '30 days';

  -- Calculate score (0-100)
  v_health_score := 0;
  
  -- Login frequency (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.logins, 0) * 2, 25);
  
  -- Candidate engagement (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.candidates_viewed, 0) / 2, 25);
  
  -- Communication (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.messages_sent, 0), 25);
  
  -- Pipeline activity (0-25)
  v_health_score := v_health_score + LEAST(COALESCE(v_metrics.pipeline_updates, 0), 25);

  v_result := jsonb_build_object(
    'health_score', LEAST(v_health_score, 100),
    'total_logins', COALESCE(v_metrics.logins, 0),
    'session_time_minutes', COALESCE(v_metrics.session_time, 0),
    'candidates_viewed', COALESCE(v_metrics.candidates_viewed, 0),
    'messages_sent', COALESCE(v_metrics.messages_sent, 0),
    'pipeline_updates', COALESCE(v_metrics.pipeline_updates, 0),
    'avg_response_time_hours', COALESCE(v_metrics.avg_response_time, 0),
    'status', CASE 
      WHEN v_health_score >= 70 THEN 'healthy'
      WHEN v_health_score >= 40 THEN 'moderate'
      ELSE 'at_risk'
    END
  );

  RETURN v_result;
END;
$$;