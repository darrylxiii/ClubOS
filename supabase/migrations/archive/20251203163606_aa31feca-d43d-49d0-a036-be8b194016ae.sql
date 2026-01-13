-- Fix get_edge_function_health function to remove invalid updated_at column reference
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
    COUNT(*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE el.severity != 'critical')::BIGINT as success_count,
    COUNT(*) FILTER (WHERE el.severity = 'critical')::BIGINT as error_count,
    ROUND(
      (COUNT(*) FILTER (WHERE el.severity != 'critical')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    ) as success_rate,
    0::NUMERIC as avg_duration_ms
  FROM error_logs el
  WHERE el.created_at > NOW() - INTERVAL '24 hours'
  AND el.component_name LIKE 'function:%'
  GROUP BY el.component_name
  ORDER BY error_count DESC;
END;
$$;