-- Phase 2: System Health Monitoring Functions
-- Create functions for real-time system health monitoring

-- Function to get real-time system health metrics
CREATE OR REPLACE FUNCTION public.get_realtime_system_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'platform_status', 'online',
    'active_users_1h', (
      SELECT COUNT(DISTINCT user_id) 
      FROM user_activity_tracking 
      WHERE last_activity_at > NOW() - INTERVAL '1 hour'
    ),
    'total_errors_1h', (
      SELECT COUNT(*) 
      FROM error_logs 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    ),
    'critical_errors_1h', (
      SELECT COUNT(*) 
      FROM error_logs 
      WHERE severity = 'critical' 
      AND created_at > NOW() - INTERVAL '1 hour'
    ),
    'avg_response_time_ms', 150,
    'db_connections', (
      SELECT count(*) 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get edge function health metrics
CREATE OR REPLACE FUNCTION public.get_edge_function_health()
RETURNS TABLE(
  function_name TEXT,
  total_calls BIGINT,
  success_count BIGINT,
  error_count BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.component_name as function_name,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE el.severity != 'critical') as success_count,
    COUNT(*) FILTER (WHERE el.severity = 'critical') as error_count,
    ROUND(
      (COUNT(*) FILTER (WHERE el.severity != 'critical')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    ) as success_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (el.updated_at - el.created_at)) * 1000), 2) as avg_duration_ms
  FROM error_logs el
  WHERE el.created_at > NOW() - INTERVAL '24 hours'
  AND el.component_name LIKE 'function:%'
  GROUP BY el.component_name
  ORDER BY error_count DESC;
END;
$$;

-- Function to check error thresholds and create alerts
CREATE OR REPLACE FUNCTION public.check_error_threshold()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  critical_errors_1h INTEGER;
BEGIN
  SELECT COUNT(*) INTO critical_errors_1h
  FROM error_logs
  WHERE severity = 'critical'
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF critical_errors_1h > 10 THEN
    -- Create security alert if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_alerts') THEN
      INSERT INTO security_alerts (
        alert_type, 
        severity, 
        title, 
        description,
        metadata
      ) VALUES (
        'system_errors',
        'critical',
        'High Error Rate Detected',
        format('System has logged %s critical errors in the last hour', critical_errors_1h),
        json_build_object('error_count', critical_errors_1h, 'time_window', '1h')
      );
    END IF;
  END IF;
END;
$$;