
-- ================================================================
-- Security Hardening Migration: Path to 100/100 (Final)
-- ================================================================

-- PHASE 1: Fix Security Definer View (ERROR)
-- ================================================================

DROP VIEW IF EXISTS public.application_status_public;

CREATE VIEW public.application_status_public 
WITH (security_invoker = on)
AS
SELECT 
  a.id,
  a.status,
  a.stages,
  a.updated_at,
  a.created_at,
  j.title as job_title,
  c.name as company_name,
  c.logo_url as company_logo
FROM applications a
LEFT JOIN jobs j ON a.job_id = j.id
LEFT JOIN companies c ON j.company_id = c.id;

GRANT SELECT ON public.application_status_public TO authenticated;

-- ================================================================
-- PHASE 2: Fix Functions Missing search_path
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_secret(
  new_secret text,
  new_name text,
  new_description text DEFAULT NULL,
  new_key_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO vault.secrets (secret, name, description, key_id)
  VALUES (new_secret, new_name, new_description, new_key_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_secret(
  secret_id uuid,
  new_secret text DEFAULT NULL,
  new_name text DEFAULT NULL,
  new_description text DEFAULT NULL,
  new_key_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE vault.secrets
  SET 
    secret = COALESCE(new_secret, secret),
    name = COALESCE(new_name, name),
    description = COALESCE(new_description, description),
    key_id = COALESCE(new_key_id, key_id)
  WHERE id = secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tqc_generate_schema_dump()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN '-- Schema dump available via admin tools';
END;
$$;

CREATE OR REPLACE FUNCTION public.tqc_generate_data_dump()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN '-- Data dump not supported';
END;
$$;

DROP FUNCTION IF EXISTS public.tqc__list_user_tables();
CREATE FUNCTION public.tqc__list_user_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
SET search_path = public
AS $$
  SELECT tablename::text FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
$$;

DROP FUNCTION IF EXISTS public.tqc__list_user_schemas();
CREATE FUNCTION public.tqc__list_user_schemas()
RETURNS TABLE(schema_name text)
LANGUAGE sql
SET search_path = public
AS $$
  SELECT nspname::text FROM pg_namespace 
  WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema'
  ORDER BY nspname;
$$;

-- ================================================================
-- PHASE 3: Tighten Critical RLS Policies 
-- Use admin-only for system tables (safer than complex joins)
-- ================================================================

-- 3.1 booking_guests - admin only (service role operations)
DROP POLICY IF EXISTS "Service role can manage booking guests" ON public.booking_guests;
CREATE POLICY "Admins manage booking guests" ON public.booking_guests
  FOR ALL
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- 3.2 booking_time_proposals - admin only
DROP POLICY IF EXISTS "Service role can manage proposals" ON public.booking_time_proposals;
CREATE POLICY "Admins manage proposals" ON public.booking_time_proposals
  FOR ALL
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- 3.3 candidate_merge_log - admin only
DROP POLICY IF EXISTS "Service role manages merge logs" ON public.candidate_merge_log;
CREATE POLICY "Admins manage merge logs" ON public.candidate_merge_log
  FOR ALL
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- 3.4 circuit_breaker_state - admin only
DROP POLICY IF EXISTS "Service role manages circuit breakers" ON public.circuit_breaker_state;
CREATE POLICY "Admins manage circuit breakers" ON public.circuit_breaker_state
  FOR ALL
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- 3.5 communication_intelligence_queue - staff only
DROP POLICY IF EXISTS "Service role manages intelligence queue" ON public.communication_intelligence_queue;
CREATE POLICY "Staff manage intelligence queue" ON public.communication_intelligence_queue
  FOR ALL
  USING (public.has_admin_role(auth.uid()) OR public.has_strategist_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()) OR public.has_strategist_role(auth.uid()));

-- 3.6 conversation_analytics - staff only
DROP POLICY IF EXISTS "Service role manages conversation analytics" ON public.conversation_analytics;
CREATE POLICY "Staff manage conversation analytics" ON public.conversation_analytics
  FOR ALL
  USING (public.has_admin_role(auth.uid()) OR public.has_strategist_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()) OR public.has_strategist_role(auth.uid()));

-- 3.7 data_integrity_checks - admin only
DROP POLICY IF EXISTS "Service role manages data integrity" ON public.data_integrity_checks;
CREATE POLICY "Admins manage data integrity" ON public.data_integrity_checks
  FOR ALL
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- 3.8 financial_events - admin only
DROP POLICY IF EXISTS "Service role manages financial events" ON public.financial_events;
CREATE POLICY "Admins manage financial events" ON public.financial_events
  FOR ALL
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- 3.9 incident_logs - admin only
DROP POLICY IF EXISTS "Service role manages incidents" ON public.incident_logs;
CREATE POLICY "Admins manage incidents" ON public.incident_logs
  FOR ALL
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- 3.10 intelligence_queue - staff only
DROP POLICY IF EXISTS "Service role manages intelligence_queue" ON public.intelligence_queue;
CREATE POLICY "Staff manage intelligence_queue" ON public.intelligence_queue
  FOR ALL
  USING (public.has_admin_role(auth.uid()) OR public.has_strategist_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()) OR public.has_strategist_role(auth.uid()));
