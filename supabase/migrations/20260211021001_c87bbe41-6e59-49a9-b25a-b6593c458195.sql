
-- Phase 1A: Fix 3 mutable function search paths

-- 1. update_notification_updated_at
CREATE OR REPLACE FUNCTION public.update_notification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. update_org_domain_settings_updated_at
CREATE OR REPLACE FUNCTION public.update_org_domain_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. update_stage_timestamp
CREATE OR REPLACE FUNCTION public.update_stage_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
