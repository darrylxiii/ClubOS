
-- 1. Alter existing functions to add search_path (without dropping)
ALTER FUNCTION public.has_admin_role(UUID) SET search_path = public;
ALTER FUNCTION public.has_strategist_role(UUID) SET search_path = public;
ALTER FUNCTION public.has_partner_role(UUID) SET search_path = public;

-- 2. Create function to auto-track login attempts
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO login_attempts (email, ip_address, user_agent, success, attempted_at)
  VALUES (p_email, p_ip_address, p_user_agent, p_success, NOW())
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt TO anon;

-- 3. Create function to auto-create user sessions on login
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_user_id UUID,
  p_session_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_country TEXT;
  v_city TEXT;
  v_is_suspicious BOOLEAN := FALSE;
  v_suspicious_reason TEXT;
  v_recent_countries TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT country) INTO v_recent_countries
  FROM user_sessions_security
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND country IS NOT NULL;
  
  IF array_length(v_recent_countries, 1) >= 2 THEN
    v_is_suspicious := TRUE;
    v_suspicious_reason := 'Multiple countries detected in 24 hours';
  END IF;
  
  IF p_ip_address IS NOT NULL THEN
    SELECT country, city INTO v_country, v_city
    FROM ip_geo_cache
    WHERE ip_address = p_ip_address
    LIMIT 1;
  END IF;
  
  INSERT INTO user_sessions_security (
    user_id, session_id, ip_address, user_agent, device_fingerprint,
    country, city, is_suspicious, suspicious_reason, created_at, last_activity
  )
  VALUES (
    p_user_id, p_session_id, p_ip_address, p_user_agent, p_device_fingerprint,
    v_country, v_city, v_is_suspicious, v_suspicious_reason, NOW(), NOW()
  )
  RETURNING id INTO v_id;
  
  IF v_is_suspicious THEN
    INSERT INTO threat_events (event_type, severity, source_ip, user_id, details, detected_at, is_resolved)
    VALUES ('impossible_travel', 'high', p_ip_address, p_user_id, 
      jsonb_build_object('reason', v_suspicious_reason, 'session_id', v_id), NOW(), FALSE);
  END IF;
  
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_session TO authenticated;

-- 4. Create function to end user session
CREATE OR REPLACE FUNCTION public.end_user_session(
  p_user_id UUID,
  p_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NOT NULL THEN
    DELETE FROM user_sessions_security WHERE user_id = p_user_id AND session_id = p_session_id;
  ELSE
    DELETE FROM user_sessions_security WHERE user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_user_session TO authenticated;

-- 5. Update session activity function  
CREATE OR REPLACE FUNCTION public.update_session_activity(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_sessions_security SET last_activity = NOW() WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_session_activity TO authenticated;
