-- Fix security linter warnings: Add search_path to all functions

-- Fix increment_dossier_view_count
CREATE OR REPLACE FUNCTION increment_dossier_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dossier_shares
  SET view_count = view_count + 1,
      updated_at = now()
  WHERE id = NEW.dossier_share_id;
  RETURN NEW;
END;
$$;

-- Fix is_company_blocked_by_candidate
CREATE OR REPLACE FUNCTION is_company_blocked_by_candidate(
  _candidate_id UUID,
  _company_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _domain TEXT;
  _is_blocked BOOLEAN;
BEGIN
  _domain := split_part(_company_email, '@', 2);
  
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_domains bd
    JOIN public.candidate_profiles cp ON cp.user_id = bd.user_id
    WHERE cp.id = _candidate_id
    AND bd.domain = _domain
  ) INTO _is_blocked;
  
  RETURN _is_blocked;
END;
$$;

-- Fix generate_dossier_share_token
CREATE OR REPLACE FUNCTION generate_dossier_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- Fix is_dossier_share_valid
CREATE OR REPLACE FUNCTION is_dossier_share_valid(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.dossier_shares
    WHERE token = _token
    AND is_revoked = false
    AND expires_at > now()
    AND (max_views IS NULL OR view_count < max_views)
  );
END;
$$;

-- Fix log_blocked_domain_change
CREATE OR REPLACE FUNCTION log_blocked_domain_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      NEW.user_id, 'configuration_change', 'create', 'blocked_domain', NEW.id,
      'User blocked company domain: ' || NEW.domain,
      jsonb_build_object('company_name', NEW.company_name, 'domain', NEW.domain),
      ARRAY['privacy', 'employer_protection']
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      OLD.user_id, 'configuration_change', 'delete', 'blocked_domain', OLD.id,
      'User unblocked company domain: ' || OLD.domain,
      jsonb_build_object('company_name', OLD.company_name, 'domain', OLD.domain),
      ARRAY['privacy', 'employer_protection']
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix log_dossier_share_event
CREATE OR REPLACE FUNCTION log_dossier_share_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      NEW.shared_by, 'data_access', 'create', 'dossier_share', NEW.id,
      'Dossier share created',
      jsonb_build_object('candidate_id', NEW.candidate_id, 'expires_at', NEW.expires_at, 'allowed_domains', NEW.allowed_domains),
      ARRAY['security', 'data_sharing', 'soc2']
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.is_revoked = true AND OLD.is_revoked = false THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      NEW.revoked_by, 'data_access', 'update', 'dossier_share', NEW.id,
      'Dossier share revoked',
      jsonb_build_object('candidate_id', NEW.candidate_id),
      ARRAY['security', 'data_sharing', 'soc2']
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;