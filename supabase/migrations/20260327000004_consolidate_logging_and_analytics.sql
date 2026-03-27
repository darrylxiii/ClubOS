-- =================================================================
-- PHASE 2c: Logging Consolidation (8 tables → 2 unified views)
-- PHASE 3a: Analytics Partitioning + Archival Strategy
-- =================================================================
-- Strategy: Create unified VIEWS over existing tables rather than
-- destructive merges. This lets us query a single "audit_log" or
-- "system_log" view while keeping existing code working.
-- Over time, new code uses the views; old tables become deprecated.
-- =================================================================

--------------------------------------------------------------------
-- PART 1: UNIFIED AUDIT LOG VIEW
-- Merges: audit_events + comprehensive_audit_logs + role_change_audit + security_logs
-- Purpose: Single pane for security/compliance/access auditing
--------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_unified_audit_log AS

-- From audit_events (16 rows)
SELECT
  id,
  'audit_event' AS log_source,
  event_type AS event_type,
  COALESCE(actor_role, 'unknown') AS event_category,
  action AS action,
  actor_id AS actor_id,
  actor_email AS actor_email,
  resource_type AS resource_type,
  resource_id::TEXT AS resource_id,
  NULL::JSONB AS old_value,
  metadata AS new_value,
  result AS result_status,
  ip_address,
  user_agent,
  created_at
FROM public.audit_events

UNION ALL

-- From comprehensive_audit_logs (266 rows)
SELECT
  id,
  'comprehensive' AS log_source,
  event_type,
  event_category,
  action,
  actor_id,
  actor_email,
  resource_type,
  resource_id::TEXT,
  before_value AS old_value,
  after_value AS new_value,
  CASE WHEN success THEN 'success' ELSE 'failed' END AS result_status,
  actor_ip_address AS ip_address,
  actor_user_agent AS user_agent,
  COALESCE(event_timestamp, created_at) AS created_at
FROM public.comprehensive_audit_logs

UNION ALL

-- From role_change_audit (2,304 rows)
SELECT
  id,
  'role_change' AS log_source,
  'role_change' AS event_type,
  'user_management' AS event_category,
  change_type AS action,
  changed_by AS actor_id,
  NULL AS actor_email,
  'user_role' AS resource_type,
  user_id::TEXT AS resource_id,
  to_jsonb(old_roles) AS old_value,
  to_jsonb(new_roles) AS new_value,
  'success' AS result_status,
  NULL AS ip_address,
  NULL AS user_agent,
  created_at
FROM public.role_change_audit

UNION ALL

-- From security_logs (100 rows)
SELECT
  id,
  'security' AS log_source,
  event_type,
  'security' AS event_category,
  event_type AS action,
  user_id AS actor_id,
  NULL AS actor_email,
  NULL AS resource_type,
  NULL AS resource_id,
  NULL AS old_value,
  metadata AS new_value,
  severity AS result_status,
  ip_address,
  user_agent,
  created_at
FROM public.security_logs;

-- Grant access
GRANT SELECT ON public.v_unified_audit_log TO authenticated;
GRANT SELECT ON public.v_unified_audit_log TO service_role;

--------------------------------------------------------------------
-- PART 2: UNIFIED SYSTEM LOG VIEW
-- Merges: error_logs + login_attempts + admin_audit_activity + pipeline_audit_logs
-- Purpose: Single pane for operational/system logging
--------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_unified_system_log AS

-- From error_logs (6,048 rows)
SELECT
  id,
  'error' AS log_source,
  error_type AS event_type,
  severity AS severity,
  user_id AS actor_id,
  error_message AS message,
  component_name AS component,
  page_url AS context_url,
  jsonb_build_object('stack', error_stack, 'user_agent', user_agent) AS metadata,
  resolved,
  created_at
FROM public.error_logs

UNION ALL

-- From login_attempts (2,660 rows)
SELECT
  id,
  'login' AS log_source,
  CASE WHEN success THEN 'login_success' ELSE 'login_failure' END AS event_type,
  CASE WHEN success THEN 'info' ELSE 'warning' END AS severity,
  NULL AS actor_id,
  CONCAT('Login attempt for ', email) AS message,
  'auth' AS component,
  NULL AS context_url,
  jsonb_build_object('email', email, 'ip_address', ip_address, 'user_agent', user_agent) AS metadata,
  success AS resolved,
  created_at
FROM public.login_attempts

UNION ALL

-- From admin_audit_activity (27 rows)
SELECT
  id,
  'admin_action' AS log_source,
  action_type AS event_type,
  'info' AS severity,
  admin_id AS actor_id,
  CONCAT(action_type, ' on ', target_entity) AS message,
  action_category AS component,
  NULL AS context_url,
  jsonb_build_object(
    'target_id', target_id,
    'old_value', old_value,
    'new_value', new_value,
    'reason', reason,
    'impact_score', impact_score
  ) AS metadata,
  true AS resolved,
  created_at
FROM public.admin_audit_activity

UNION ALL

-- From pipeline_audit_logs (837 rows)
SELECT
  id,
  'pipeline' AS log_source,
  action AS event_type,
  'info' AS severity,
  user_id AS actor_id,
  action AS message,
  'pipeline' AS component,
  NULL AS context_url,
  stage_data AS metadata,
  true AS resolved,
  created_at
FROM public.pipeline_audit_logs;

-- Grant access
GRANT SELECT ON public.v_unified_system_log TO authenticated;
GRANT SELECT ON public.v_unified_system_log TO service_role;

--------------------------------------------------------------------
-- PART 3: ANALYTICS ARCHIVAL + CLEANUP
-- Auto-archive telemetry data older than 90 days
-- Keeps tables lean for query performance
--------------------------------------------------------------------

-- 3a. Create archive tables for high-volume telemetry
CREATE TABLE IF NOT EXISTS public.user_session_events_archive (
  LIKE public.user_session_events INCLUDING ALL
);
ALTER TABLE public.user_session_events_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on session archive"
  ON public.user_session_events_archive FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.user_frustration_signals_archive (
  LIKE public.user_frustration_signals INCLUDING ALL
);
ALTER TABLE public.user_frustration_signals_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on frustration archive"
  ON public.user_frustration_signals_archive FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3b. Archive function: moves old telemetry to archive tables
CREATE OR REPLACE FUNCTION public.archive_old_telemetry(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE (
  table_name TEXT,
  rows_archived BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  v_count BIGINT;
BEGIN
  cutoff_date := now() - (p_days_to_keep || ' days')::INTERVAL;

  -- Archive user_session_events (115K+ rows)
  WITH moved AS (
    DELETE FROM public.user_session_events
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.user_session_events_archive
  SELECT * FROM moved;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'user_session_events';
  rows_archived := v_count;
  RETURN NEXT;

  -- Archive user_frustration_signals (11K+ rows)
  WITH moved AS (
    DELETE FROM public.user_frustration_signals
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.user_frustration_signals_archive
  SELECT * FROM moved;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'user_frustration_signals';
  rows_archived := v_count;
  RETURN NEXT;

  -- Purge old user_device_info (keep only latest per user)
  DELETE FROM public.user_device_info
  WHERE created_at < cutoff_date
    AND id NOT IN (
      SELECT DISTINCT ON (user_id) id
      FROM public.user_device_info
      ORDER BY user_id, created_at DESC
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'user_device_info';
  rows_archived := v_count;
  RETURN NEXT;

  -- Purge old user_page_analytics
  DELETE FROM public.user_page_analytics
  WHERE created_at < cutoff_date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'user_page_analytics';
  rows_archived := v_count;
  RETURN NEXT;

  -- Purge old user_events
  DELETE FROM public.user_events
  WHERE created_at < cutoff_date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'user_events';
  rows_archived := v_count;
  RETURN NEXT;
END;
$$;

-- 3c. Indexes for archive queries
CREATE INDEX IF NOT EXISTS idx_session_archive_created
  ON public.user_session_events_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_frustration_archive_created
  ON public.user_frustration_signals_archive(created_at DESC);

-- 3d. Optimized indexes on main analytics tables
-- Partial index: only recent events matter for real-time dashboards
CREATE INDEX IF NOT EXISTS idx_session_events_recent
  ON public.user_session_events(created_at DESC)
  WHERE created_at > (now() - INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_page_analytics_recent
  ON public.user_page_analytics(created_at DESC)
  WHERE created_at > (now() - INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_frustration_recent
  ON public.user_frustration_signals(created_at DESC)
  WHERE created_at > (now() - INTERVAL '30 days');

-- 3e. Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_session_events_user_type
  ON public.user_session_events(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_tracking_user
  ON public.user_activity_tracking(user_id, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity
  ON public.error_logs(error_type, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_recent
  ON public.login_attempts(email, created_at DESC)
  WHERE created_at > (now() - INTERVAL '24 hours');

--------------------------------------------------------------------
-- PART 4: UNIFIED ANALYTICS VIEW
-- Single query point for admin dashboards instead of 4 separate queries
--------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_analytics_summary AS
SELECT
  date_trunc('hour', created_at) AS hour_bucket,
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users,
  'session_event' AS event_source
FROM public.user_session_events
WHERE created_at > (now() - INTERVAL '24 hours')
GROUP BY date_trunc('hour', created_at)

UNION ALL

SELECT
  date_trunc('hour', created_at) AS hour_bucket,
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users,
  'page_view' AS event_source
FROM public.user_page_analytics
WHERE created_at > (now() - INTERVAL '24 hours')
GROUP BY date_trunc('hour', created_at)

UNION ALL

SELECT
  date_trunc('hour', created_at) AS hour_bucket,
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users,
  'frustration' AS event_source
FROM public.user_frustration_signals
WHERE created_at > (now() - INTERVAL '24 hours')
GROUP BY date_trunc('hour', created_at);

GRANT SELECT ON public.v_analytics_summary TO authenticated;
GRANT SELECT ON public.v_analytics_summary TO service_role;
