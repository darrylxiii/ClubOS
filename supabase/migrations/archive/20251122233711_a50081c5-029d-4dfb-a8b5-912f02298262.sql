-- Fix function search path security warning
DROP FUNCTION IF EXISTS get_system_health_metrics();

CREATE OR REPLACE FUNCTION get_system_health_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
  error_data RECORD;
BEGIN
  -- Get error statistics
  SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as total_errors_24h,
    COUNT(*) FILTER (WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours') as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'warning' AND created_at > NOW() - INTERVAL '24 hours') as warnings
  INTO error_data
  FROM error_logs;

  -- Build result
  SELECT json_build_object(
    'platform_status', 'online',
    'uptime_percentage', 99.9,
    'total_errors_24h', COALESCE(error_data.total_errors_24h, 0),
    'critical_errors', COALESCE(error_data.critical_errors, 0),
    'warnings', COALESCE(error_data.warnings, 0),
    'avg_response_time_ms', 150,
    'last_backup', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_system_health_metrics() TO authenticated;

-- Fix other functions with search path
DROP FUNCTION IF EXISTS get_realtime_system_health();

CREATE OR REPLACE FUNCTION get_realtime_system_health()
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_realtime_system_health() TO authenticated;

-- Fix edge function health function
DROP FUNCTION IF EXISTS get_edge_function_health();

CREATE OR REPLACE FUNCTION get_edge_function_health()
RETURNS TABLE(
  function_name TEXT,
  total_calls BIGINT,
  success_count BIGINT,
  error_count BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_edge_function_health() TO authenticated;

-- Fix check_error_threshold function
DROP FUNCTION IF EXISTS check_error_threshold();

CREATE OR REPLACE FUNCTION check_error_threshold()
RETURNS void AS $$
DECLARE
  critical_errors_1h INTEGER;
BEGIN
  SELECT COUNT(*) INTO critical_errors_1h
  FROM error_logs
  WHERE severity = 'critical'
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF critical_errors_1h > 10 THEN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION check_error_threshold() TO authenticated;