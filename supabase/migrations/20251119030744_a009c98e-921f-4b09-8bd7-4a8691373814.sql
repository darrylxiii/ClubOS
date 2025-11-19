-- ============================================
-- Security Dashboard: Metrics History & Alerts
-- ============================================

-- Track historical security metrics for trend analysis
CREATE TABLE security_metrics_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- RLS Metrics
  total_tables integer NOT NULL,
  tables_with_rls integer NOT NULL,
  total_rls_policies integer NOT NULL,
  
  -- Auth Metrics
  total_auth_attempts integer DEFAULT 0,
  failed_auth_attempts integer DEFAULT 0,
  unique_failed_ips integer DEFAULT 0,
  
  -- Rate Limiting Metrics
  rate_limit_rejections integer DEFAULT 0,
  unique_rate_limited_ips integer DEFAULT 0,
  
  -- Storage Metrics
  total_buckets integer DEFAULT 0,
  public_buckets integer DEFAULT 0,
  buckets_with_size_limits integer DEFAULT 0,
  
  -- Edge Function Metrics
  total_edge_functions integer DEFAULT 0,
  authenticated_functions integer DEFAULT 0,
  public_functions integer DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT unique_metric_date UNIQUE (metric_date)
);

-- Enable RLS
ALTER TABLE security_metrics_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins view security metrics history"
ON security_metrics_history FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for efficient date-based queries
CREATE INDEX idx_security_metrics_history_date 
ON security_metrics_history(metric_date DESC);

-- Security alerts table
CREATE TABLE security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_dismissed boolean DEFAULT false,
  dismissed_at timestamp with time zone,
  dismissed_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security alerts"
ON security_alerts FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_security_alerts_active 
ON security_alerts(created_at DESC) 
WHERE is_dismissed = false;

-- Get RLS policy count and coverage
CREATE OR REPLACE FUNCTION get_rls_policy_count()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_policies', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'),
    'tables_with_rls', (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public'),
    'total_tables', (SELECT COUNT(*) FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
    'top_tables', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) t
    )
  );
$$;

-- Get storage bucket security stats
CREATE OR REPLACE FUNCTION get_storage_bucket_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_buckets', COUNT(*),
    'public_buckets', COUNT(*) FILTER (WHERE public = true),
    'private_buckets', COUNT(*) FILTER (WHERE public = false),
    'with_size_limits', COUNT(*) FILTER (WHERE file_size_limit IS NOT NULL),
    'with_mime_restrictions', COUNT(*) FILTER (WHERE allowed_mime_types IS NOT NULL)
  )
  FROM storage.buckets;
$$;

-- Get failed auth attempts with IP aggregation
CREATE OR REPLACE FUNCTION get_auth_failure_stats(hours_back integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_failures', COUNT(*),
    'unique_ips', COUNT(DISTINCT actor_ip_address),
    'hourly_breakdown', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT 
          DATE_TRUNC('hour', event_timestamp) as hour,
          COUNT(*) as failure_count
        FROM comprehensive_audit_logs
        WHERE event_type = 'authentication'
          AND success = false
          AND event_timestamp > NOW() - (hours_back || ' hours')::interval
        GROUP BY DATE_TRUNC('hour', event_timestamp)
        ORDER BY hour DESC
        LIMIT 24
      ) t
    ),
    'top_ips', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT 
          actor_ip_address as ip,
          COUNT(*) as failure_count
        FROM comprehensive_audit_logs
        WHERE event_type = 'authentication'
          AND success = false
          AND event_timestamp > NOW() - (hours_back || ' hours')::interval
          AND actor_ip_address IS NOT NULL
        GROUP BY actor_ip_address
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) t
    )
  ) INTO result
  FROM comprehensive_audit_logs
  WHERE event_type = 'authentication'
    AND success = false
    AND event_timestamp > NOW() - (hours_back || ' hours')::interval;

  RETURN COALESCE(result, jsonb_build_object('total_failures', 0, 'unique_ips', 0, 'hourly_breakdown', '[]'::jsonb, 'top_ips', '[]'::jsonb));
END;
$$;

-- Daily metric aggregation function
CREATE OR REPLACE FUNCTION aggregate_daily_security_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
BEGIN
  INSERT INTO security_metrics_history (
    metric_date,
    total_tables,
    tables_with_rls,
    total_rls_policies,
    failed_auth_attempts,
    rate_limit_rejections,
    total_buckets,
    public_buckets
  )
  SELECT
    today,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public'),
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'),
    (SELECT COUNT(*) FROM comprehensive_audit_logs 
     WHERE event_type = 'authentication' 
     AND success = false
     AND DATE(event_timestamp) = today),
    (SELECT COUNT(*) FROM ai_rate_limits 
     WHERE DATE(window_start) = today 
     AND request_count >= 10),
    (SELECT COUNT(*) FROM storage.buckets),
    (SELECT COUNT(*) FROM storage.buckets WHERE public = true)
  ON CONFLICT (metric_date) 
  DO UPDATE SET
    total_tables = EXCLUDED.total_tables,
    tables_with_rls = EXCLUDED.tables_with_rls,
    total_rls_policies = EXCLUDED.total_rls_policies,
    failed_auth_attempts = EXCLUDED.failed_auth_attempts,
    rate_limit_rejections = EXCLUDED.rate_limit_rejections,
    total_buckets = EXCLUDED.total_buckets,
    public_buckets = EXCLUDED.public_buckets;
END;
$$;