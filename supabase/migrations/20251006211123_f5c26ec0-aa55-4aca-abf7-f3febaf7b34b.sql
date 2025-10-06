-- Create verification tables for secure email and SMS verification

-- Email verifications table
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Phone verifications table
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Verification attempts log (for security and fraud detection)
CREATE TABLE IF NOT EXISTS public.verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('email', 'phone')),
  action text NOT NULL CHECK (action IN ('send', 'verify', 'resend')),
  success boolean NOT NULL,
  email text,
  phone text,
  error_message text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_verifications
CREATE POLICY "Users can view their own email verifications"
ON public.email_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all email verifications"
ON public.email_verifications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for phone_verifications
CREATE POLICY "Users can view their own phone verifications"
ON public.phone_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all phone verifications"
ON public.phone_verifications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for verification_attempts
CREATE POLICY "Users can view their own verification attempts"
ON public.verification_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all verification attempts"
ON public.verification_attempts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for performance
CREATE INDEX idx_email_verifications_user_id ON public.email_verifications(user_id);
CREATE INDEX idx_email_verifications_expires_at ON public.email_verifications(expires_at);
CREATE INDEX idx_phone_verifications_user_id ON public.phone_verifications(user_id);
CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);
CREATE INDEX idx_verification_attempts_user_id ON public.verification_attempts(user_id);
CREATE INDEX idx_verification_attempts_created_at ON public.verification_attempts(created_at);

-- Function to check rate limiting for verification attempts
CREATE OR REPLACE FUNCTION public.check_verification_rate_limit(
  _user_id uuid,
  _verification_type text,
  _action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_attempts integer;
  result jsonb;
BEGIN
  -- Count attempts in last 15 minutes
  SELECT COUNT(*) INTO recent_attempts
  FROM verification_attempts
  WHERE user_id = _user_id
    AND verification_type = _verification_type
    AND action = _action
    AND created_at > now() - interval '15 minutes';
  
  -- Allow max 3 send attempts per 15 minutes
  IF _action = 'send' OR _action = 'resend' THEN
    IF recent_attempts >= 3 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'message', 'Too many attempts. Please wait 15 minutes.',
        'attempts', recent_attempts
      );
    END IF;
  END IF;
  
  -- Allow max 5 verify attempts per 15 minutes
  IF _action = 'verify' THEN
    IF recent_attempts >= 5 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'message', 'Too many verification attempts. Please request a new code.',
        'attempts', recent_attempts
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts', recent_attempts
  );
END;
$$;

-- Function to clean up expired verifications (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM email_verifications WHERE expires_at < now() AND verified_at IS NULL;
  DELETE FROM phone_verifications WHERE expires_at < now() AND verified_at IS NULL;
  
  -- Delete old verification attempts (keep for 30 days)
  DELETE FROM verification_attempts WHERE created_at < now() - interval '30 days';
END;
$$;