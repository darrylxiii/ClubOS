-- Phase 2: God Mode Admin Capabilities

-- 1. Admin Impersonation Sessions Table
CREATE TABLE public.admin_impersonation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  ended_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  actions_performed JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Feature Flags Table
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_roles TEXT[] DEFAULT '{}',
  target_company_ids UUID[] DEFAULT '{}',
  target_user_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Add maintenance_mode to security_config if not exists
INSERT INTO public.security_config (config_key, config_value, description)
VALUES ('maintenance_mode', '{"enabled": false, "message": "", "eta": null, "allowed_roles": ["admin", "super_admin"]}'::jsonb, 'Platform maintenance mode configuration')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_impersonation_sessions
CREATE POLICY "Super admins can manage impersonation sessions"
  ON public.admin_impersonation_sessions
  FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Admins can view their own impersonation sessions"
  ON public.admin_impersonation_sessions
  FOR SELECT
  USING (admin_id = auth.uid());

-- RLS Policies for feature_flags
CREATE POLICY "Admins can view feature flags"
  ON public.feature_flags
  FOR SELECT
  USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  USING (public.is_super_admin());

-- Function to start impersonation session
CREATE OR REPLACE FUNCTION public.start_impersonation_session(
  p_target_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Only super admins can impersonate
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can impersonate users';
  END IF;
  
  -- Cannot impersonate self
  IF v_admin_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot impersonate yourself';
  END IF;
  
  -- Cannot impersonate other super admins
  IF public.is_super_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'Cannot impersonate other super admins';
  END IF;
  
  -- End any existing active sessions for this admin
  UPDATE public.admin_impersonation_sessions
  SET is_active = false, ended_at = now()
  WHERE admin_id = v_admin_id AND is_active = true;
  
  -- Create new session
  INSERT INTO public.admin_impersonation_sessions (admin_id, target_user_id, reason)
  VALUES (v_admin_id, p_target_user_id, p_reason)
  RETURNING id INTO v_session_id;
  
  -- Log the action
  INSERT INTO public.admin_account_actions (admin_id, target_user_id, action_type, reason)
  VALUES (v_admin_id, p_target_user_id, 'impersonation_started', p_reason);
  
  RETURN v_session_id;
END;
$$;

-- Function to end impersonation session
CREATE OR REPLACE FUNCTION public.end_impersonation_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session
  FROM public.admin_impersonation_sessions
  WHERE id = p_session_id AND admin_id = auth.uid() AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  UPDATE public.admin_impersonation_sessions
  SET is_active = false, ended_at = now()
  WHERE id = p_session_id;
  
  -- Log the action
  INSERT INTO public.admin_account_actions (admin_id, target_user_id, action_type, metadata)
  VALUES (auth.uid(), v_session.target_user_id, 'impersonation_ended', 
    jsonb_build_object('session_id', p_session_id, 'duration_minutes', 
      EXTRACT(EPOCH FROM (now() - v_session.started_at)) / 60));
  
  RETURN true;
END;
$$;

-- Function to check if feature flag is enabled for user
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_flag_key TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag RECORD;
  v_user_id UUID;
  v_user_role TEXT;
  v_company_id UUID;
  v_random_value INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT * INTO v_flag FROM public.feature_flags WHERE flag_key = p_flag_key;
  
  IF NOT FOUND OR NOT v_flag.enabled THEN
    RETURN false;
  END IF;
  
  -- Check if user is specifically targeted
  IF v_flag.target_user_ids IS NOT NULL AND array_length(v_flag.target_user_ids, 1) > 0 THEN
    IF v_user_id = ANY(v_flag.target_user_ids) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check role targeting
  IF v_flag.target_roles IS NOT NULL AND array_length(v_flag.target_roles, 1) > 0 THEN
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = v_user_id LIMIT 1;
    IF v_user_role IS NOT NULL AND v_user_role = ANY(v_flag.target_roles) THEN
      -- Apply rollout percentage
      v_random_value := (hashtext(v_user_id::text || p_flag_key) % 100 + 100) % 100;
      RETURN v_random_value < v_flag.rollout_percentage;
    END IF;
  END IF;
  
  -- Check company targeting
  IF v_flag.target_company_ids IS NOT NULL AND array_length(v_flag.target_company_ids, 1) > 0 THEN
    SELECT company_id INTO v_company_id FROM public.company_members WHERE user_id = v_user_id LIMIT 1;
    IF v_company_id IS NOT NULL AND v_company_id = ANY(v_flag.target_company_ids) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- If no specific targeting, apply to all with rollout percentage
  IF (v_flag.target_roles IS NULL OR array_length(v_flag.target_roles, 1) = 0)
     AND (v_flag.target_company_ids IS NULL OR array_length(v_flag.target_company_ids, 1) = 0)
     AND (v_flag.target_user_ids IS NULL OR array_length(v_flag.target_user_ids, 1) = 0) THEN
    v_random_value := (hashtext(v_user_id::text || p_flag_key) % 100 + 100) % 100;
    RETURN v_random_value < v_flag.rollout_percentage;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to toggle maintenance mode
CREATE OR REPLACE FUNCTION public.toggle_maintenance_mode(
  p_enabled BOOLEAN,
  p_message TEXT DEFAULT NULL,
  p_eta TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can toggle maintenance mode';
  END IF;
  
  UPDATE public.security_config
  SET config_value = jsonb_build_object(
    'enabled', p_enabled,
    'message', COALESCE(p_message, ''),
    'eta', p_eta,
    'allowed_roles', ARRAY['admin', 'super_admin'],
    'toggled_by', auth.uid(),
    'toggled_at', now()
  ),
  updated_at = now()
  WHERE config_key = 'maintenance_mode';
  
  -- Log the action
  INSERT INTO public.admin_audit_activity (admin_id, action_type, action_category, target_entity, metadata)
  VALUES (auth.uid(), 'maintenance_mode_toggle', 'system', 'platform', 
    jsonb_build_object('enabled', p_enabled, 'message', p_message, 'eta', p_eta));
  
  RETURN true;
END;
$$;

-- Function to get maintenance mode status
CREATE OR REPLACE FUNCTION public.get_maintenance_mode()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT config_value INTO v_config
  FROM public.security_config
  WHERE config_key = 'maintenance_mode';
  
  RETURN COALESCE(v_config, '{"enabled": false}'::jsonb);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.start_impersonation_session(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_impersonation_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_maintenance_mode(BOOLEAN, TEXT, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_maintenance_mode() TO authenticated;