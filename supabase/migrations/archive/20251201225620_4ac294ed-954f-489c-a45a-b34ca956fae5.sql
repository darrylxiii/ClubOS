-- Fix the check_verification_rate_limit function to return complete data
CREATE OR REPLACE FUNCTION public.check_verification_rate_limit(
  _user_id UUID,
  _verification_type TEXT,
  _max_attempts INTEGER DEFAULT 5,
  _window_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_attempts INTEGER;
  oldest_attempt TIMESTAMPTZ;
  retry_after_seconds INTEGER;
  retry_after_minutes NUMERIC;
BEGIN
  -- Count recent attempts within the window
  SELECT COUNT(*), MIN(created_at)
  INTO recent_attempts, oldest_attempt
  FROM verification_attempts
  WHERE user_id = _user_id
    AND verification_type = _verification_type
    AND action = 'send'
    AND created_at > NOW() - (_window_minutes || ' minutes')::INTERVAL;

  -- If under limit, allow
  IF recent_attempts < _max_attempts THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts', recent_attempts,
      'max_attempts', _max_attempts,
      'remaining', _max_attempts - recent_attempts,
      'window_minutes', _window_minutes
    );
  END IF;

  -- Calculate retry time based on oldest attempt in window
  retry_after_seconds := EXTRACT(EPOCH FROM (oldest_attempt + (_window_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER;
  retry_after_minutes := ROUND(retry_after_seconds / 60.0, 1);

  -- Ensure we don't return negative values
  IF retry_after_seconds < 0 THEN
    retry_after_seconds := 0;
    retry_after_minutes := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', false,
    'message', format('Too many attempts. Please wait %s minutes.', CEIL(retry_after_minutes)),
    'attempts', recent_attempts,
    'max_attempts', _max_attempts,
    'retry_after_seconds', retry_after_seconds,
    'retry_after_minutes', retry_after_minutes,
    'earliest_retry_at', oldest_attempt + (_window_minutes || ' minutes')::INTERVAL
  );
END;
$$;

-- Create admin function to reset user verification rate limit
CREATE OR REPLACE FUNCTION public.reset_user_verification_rate_limit(
  _user_id UUID,
  _verification_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete verification attempts for the user
  IF _verification_type IS NULL THEN
    DELETE FROM verification_attempts
    WHERE user_id = _user_id
    AND created_at > NOW() - INTERVAL '30 minutes';
  ELSE
    DELETE FROM verification_attempts
    WHERE user_id = _user_id
    AND verification_type = _verification_type
    AND created_at > NOW() - INTERVAL '30 minutes';
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_attempts', deleted_count,
    'user_id', _user_id,
    'verification_type', COALESCE(_verification_type, 'all')
  );
END;
$$;

-- Grant execute to authenticated users (admin check will be in application layer)
GRANT EXECUTE ON FUNCTION public.reset_user_verification_rate_limit TO authenticated;