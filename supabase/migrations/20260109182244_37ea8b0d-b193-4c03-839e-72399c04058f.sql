-- ============================================
-- SECURITY FIXES: Drop and recreate functions
-- ============================================

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_realtime_system_health();

-- Create a function to get system health with proper security
CREATE FUNCTION public.get_realtime_system_health()
RETURNS TABLE (
  metric_name text,
  value numeric,
  status text,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    km.metric_name::text,
    km.value::numeric,
    km.status::text,
    km.updated_at::timestamptz
  FROM kpi_metrics km
  WHERE km.category = 'system_health'
  ORDER BY km.metric_name;
END;
$$;

-- Create a function to get KPI summary for dashboard
CREATE OR REPLACE FUNCTION public.get_kpi_dashboard_summary()
RETURNS TABLE (
  domain text,
  total_metrics bigint,
  healthy_count bigint,
  warning_count bigint,
  critical_count bigint,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'operations'::text as domain,
    COUNT(*)::bigint as total_metrics,
    COUNT(*) FILTER (WHERE status = 'healthy')::bigint as healthy_count,
    COUNT(*) FILTER (WHERE status = 'warning')::bigint as warning_count,
    COUNT(*) FILTER (WHERE status = 'critical')::bigint as critical_count,
    MAX(updated_at)::timestamptz as last_updated
  FROM kpi_metrics
  UNION ALL
  SELECT 
    'sales'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'healthy')::bigint,
    COUNT(*) FILTER (WHERE status = 'warning')::bigint,
    COUNT(*) FILTER (WHERE status = 'critical')::bigint,
    MAX(updated_at)::timestamptz
  FROM sales_kpi_metrics
  UNION ALL
  SELECT 
    'website'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'healthy')::bigint,
    COUNT(*) FILTER (WHERE status = 'warning')::bigint,
    COUNT(*) FILTER (WHERE status = 'critical')::bigint,
    MAX(updated_at)::timestamptz
  FROM web_kpi_metrics;
END;
$$;

-- Create SLA monitoring function
CREATE OR REPLACE FUNCTION public.get_kpi_sla_status()
RETURNS TABLE (
  domain text,
  freshness_minutes numeric,
  is_stale boolean,
  sla_status text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'operations'::text,
    EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) / 60 as freshness_minutes,
    MAX(updated_at) < NOW() - INTERVAL '1 hour' as is_stale,
    CASE 
      WHEN MAX(updated_at) >= NOW() - INTERVAL '15 minutes' THEN 'fresh'
      WHEN MAX(updated_at) >= NOW() - INTERVAL '1 hour' THEN 'stale'
      ELSE 'critical'
    END as sla_status
  FROM kpi_metrics
  UNION ALL
  SELECT 
    'sales'::text,
    EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) / 60,
    MAX(updated_at) < NOW() - INTERVAL '1 hour',
    CASE 
      WHEN MAX(updated_at) >= NOW() - INTERVAL '15 minutes' THEN 'fresh'
      WHEN MAX(updated_at) >= NOW() - INTERVAL '1 hour' THEN 'stale'
      ELSE 'critical'
    END
  FROM sales_kpi_metrics
  UNION ALL
  SELECT 
    'website'::text,
    EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) / 60,
    MAX(updated_at) < NOW() - INTERVAL '1 hour',
    CASE 
      WHEN MAX(updated_at) >= NOW() - INTERVAL '15 minutes' THEN 'fresh'
      WHEN MAX(updated_at) >= NOW() - INTERVAL '1 hour' THEN 'stale'
      ELSE 'critical'
    END
  FROM web_kpi_metrics;
END;
$$;

COMMENT ON FUNCTION public.get_kpi_dashboard_summary() IS 'Returns aggregated KPI health summary by domain for dashboard display';
COMMENT ON FUNCTION public.get_kpi_sla_status() IS 'Returns SLA status for each KPI domain showing data freshness';
COMMENT ON FUNCTION public.get_realtime_system_health() IS 'Returns current system health metrics with proper security';