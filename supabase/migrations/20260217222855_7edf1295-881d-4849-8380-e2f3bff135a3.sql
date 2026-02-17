
-- Step 1: Add correlation_id to password_reset_tokens
ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS correlation_id UUID DEFAULT gen_random_uuid();

-- Step 2: Add correlation_id and device_fingerprint to password_reset_attempts
ALTER TABLE public.password_reset_attempts
  ADD COLUMN IF NOT EXISTS correlation_id UUID,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- Step 3: Index for device fingerprint rate limiting
CREATE INDEX IF NOT EXISTS idx_pra_device_fingerprint
  ON public.password_reset_attempts (device_fingerprint, attempted_at DESC)
  WHERE device_fingerprint IS NOT NULL;

-- Step 4: Create security_alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  email TEXT,
  ip_address TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Service role only (no public access)
CREATE POLICY "Service role only on security_alerts"
  ON public.security_alerts
  FOR ALL
  USING (false);

-- Step 5: Create password_reset_funnel_stats view
CREATE OR REPLACE VIEW public.password_reset_funnel_stats AS
SELECT
  date_trunc('day', attempted_at)::date AS day,
  COUNT(*) FILTER (WHERE attempt_type = 'request' AND success = true) AS requests,
  COUNT(*) FILTER (WHERE attempt_type = 'validate_otp' AND success = true) AS otp_validations,
  COUNT(*) FILTER (WHERE attempt_type = 'validate_token' AND success = true) AS token_validations,
  COUNT(*) FILTER (WHERE attempt_type = 'set_password' AND success = true) AS completions,
  COUNT(*) FILTER (WHERE attempt_type = 'validate_otp' AND success = false) AS otp_failures,
  COUNT(*) FILTER (WHERE attempt_type = 'validate_token' AND success = false) AS token_failures,
  COUNT(*) FILTER (WHERE attempt_type = 'set_password' AND success = false) AS set_failures,
  ROUND(
    CASE
      WHEN COUNT(*) FILTER (WHERE attempt_type = 'request' AND success = true) > 0
      THEN (COUNT(*) FILTER (WHERE attempt_type = 'set_password' AND success = true)::numeric /
            COUNT(*) FILTER (WHERE attempt_type = 'request' AND success = true)::numeric) * 100
      ELSE 0
    END, 1
  ) AS completion_rate_pct
FROM public.password_reset_attempts
GROUP BY date_trunc('day', attempted_at)::date
ORDER BY day DESC;

-- Step 6: Create health function
CREATE OR REPLACE FUNCTION public.get_password_reset_health(p_days INTEGER DEFAULT 7)
RETURNS TABLE(
  total_requests BIGINT,
  total_otp_validations BIGINT,
  total_token_validations BIGINT,
  total_completions BIGINT,
  completion_rate NUMERIC,
  total_failures BIGINT,
  most_common_failure TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE attempt_type = 'request' AND success = true),
    COUNT(*) FILTER (WHERE attempt_type = 'validate_otp' AND success = true),
    COUNT(*) FILTER (WHERE attempt_type = 'validate_token' AND success = true),
    COUNT(*) FILTER (WHERE attempt_type = 'set_password' AND success = true),
    ROUND(
      CASE
        WHEN COUNT(*) FILTER (WHERE attempt_type = 'request' AND success = true) > 0
        THEN (COUNT(*) FILTER (WHERE attempt_type = 'set_password' AND success = true)::numeric /
              COUNT(*) FILTER (WHERE attempt_type = 'request' AND success = true)::numeric) * 100
        ELSE 0
      END, 1
    ),
    COUNT(*) FILTER (WHERE success = false),
    (SELECT a.attempt_type FROM public.password_reset_attempts a
     WHERE a.success = false AND a.attempted_at > now() - make_interval(days => p_days)
     GROUP BY a.attempt_type ORDER BY COUNT(*) DESC LIMIT 1)
  FROM public.password_reset_attempts
  WHERE attempted_at > now() - make_interval(days => p_days);
END;
$$;

-- Step 7: Update rate limit function to support device fingerprint
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(
  p_email TEXT,
  p_ip_address TEXT,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_count INTEGER;
  ip_count INTEGER;
  fp_count INTEGER;
  result JSONB;
BEGIN
  -- Count attempts by email in last 15 minutes
  SELECT COUNT(*) INTO email_count
  FROM password_reset_attempts
  WHERE email = p_email
    AND attempted_at > now() - interval '15 minutes'
    AND attempt_type = 'request';

  -- Count attempts by IP in last 15 minutes
  SELECT COUNT(*) INTO ip_count
  FROM password_reset_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > now() - interval '15 minutes'
    AND attempt_type = 'request';

  -- Count attempts by device fingerprint in last 15 minutes
  fp_count := 0;
  IF p_device_fingerprint IS NOT NULL AND p_device_fingerprint != '' THEN
    SELECT COUNT(*) INTO fp_count
    FROM password_reset_attempts
    WHERE device_fingerprint = p_device_fingerprint
      AND attempted_at > now() - interval '15 minutes'
      AND attempt_type = 'request';
  END IF;

  IF email_count >= 3 THEN
    result := jsonb_build_object(
      'allowed', false,
      'message', 'Too many reset requests for this email. Please try again in 15 minutes.',
      'reason', 'email_limit'
    );
  ELSIF ip_count >= 10 THEN
    result := jsonb_build_object(
      'allowed', false,
      'message', 'Too many reset requests from this location. Please try again in 15 minutes.',
      'reason', 'ip_limit'
    );
  ELSIF fp_count >= 5 THEN
    result := jsonb_build_object(
      'allowed', false,
      'message', 'Too many reset requests from this device. Please try again in 15 minutes.',
      'reason', 'device_limit'
    );
  ELSE
    result := jsonb_build_object('allowed', true);
  END IF;

  RETURN result;
END;
$$;
