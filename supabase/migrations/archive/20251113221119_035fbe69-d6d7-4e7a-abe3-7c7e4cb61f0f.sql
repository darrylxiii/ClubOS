-- Password reset tokens (hybrid: magic link + OTP)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  magic_token TEXT UNIQUE NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  attempts INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_password_reset_magic ON public.password_reset_tokens(magic_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_otp ON public.password_reset_tokens(otp_code, email);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON public.password_reset_tokens(expires_at);

-- Password history (prevent reuse of last 5 passwords)
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_date ON public.password_history(user_id, created_at DESC);

-- Password reset attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT false,
  attempt_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email ON public.password_reset_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip ON public.password_reset_attempts(ip_address, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own password history"
  ON public.password_history FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check password reset rate limit
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(p_email TEXT, p_ip_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_attempts INT;
  ip_attempts INT;
BEGIN
  -- Count attempts in last 15 minutes by email
  SELECT COUNT(*) INTO email_attempts
  FROM password_reset_attempts
  WHERE email = p_email
    AND attempted_at > now() - interval '15 minutes';
  
  -- Count attempts in last 15 minutes by IP
  SELECT COUNT(*) INTO ip_attempts
  FROM password_reset_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > now() - interval '15 minutes';
  
  -- Allow max 3 per email or 10 per IP
  IF email_attempts >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'email_limit',
      'message', 'Too many reset requests. Please try again in 15 minutes.'
    );
  END IF;
  
  IF ip_attempts >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ip_limit',
      'message', 'Too many requests from this location. Please try again later.'
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < now() AND is_used = false;
  
  DELETE FROM password_reset_attempts 
  WHERE attempted_at < now() - interval '30 days';
END;
$$;