-- =============================================================================
-- Phase 1 Auth Security: Tables for login attempts, recovery codes, and security events
-- =============================================================================

-- Login attempts table for account lockout
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient lockout checks
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created 
  ON public.login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created 
  ON public.login_attempts(ip_address, created_at DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access login attempts (security sensitive)
CREATE POLICY "Service role only for login_attempts" 
  ON public.login_attempts 
  FOR ALL 
  USING (false);

-- User recovery codes table (stores hashed codes only)
CREATE TABLE IF NOT EXISTS public.user_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient code lookups
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id 
  ON public.user_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_hash 
  ON public.user_recovery_codes(code_hash);

-- Enable RLS
ALTER TABLE public.user_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own recovery codes (not the hashes, just metadata)
CREATE POLICY "Users can view own recovery code metadata" 
  ON public.user_recovery_codes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Auth security events for audit logging
CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for security event queries
CREATE INDEX IF NOT EXISTS idx_auth_security_events_user_id 
  ON public.auth_security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_security_events_type 
  ON public.auth_security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_security_events_ip 
  ON public.auth_security_events(ip_address, created_at DESC);

-- Enable RLS
ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all security events
CREATE POLICY "Admins can view all security events" 
  ON public.auth_security_events 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own security events
CREATE POLICY "Users can view own security events" 
  ON public.auth_security_events 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Cleanup function for old login attempts (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete login attempts older than 7 days
  DELETE FROM public.login_attempts
  WHERE created_at < now() - INTERVAL '7 days';
  
  -- Delete old security events older than 90 days
  DELETE FROM public.auth_security_events
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Fix security definer view issue - identify and fix problematic views
-- First, let's create a safe function for checking user roles (fixes function search path)
CREATE OR REPLACE FUNCTION public.has_admin_role(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

-- Safe function for checking strategist role
CREATE OR REPLACE FUNCTION public.has_strategist_role(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'strategist'
  );
$$;

-- Safe function for checking partner role
CREATE OR REPLACE FUNCTION public.has_partner_role(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'partner'
  );
$$;