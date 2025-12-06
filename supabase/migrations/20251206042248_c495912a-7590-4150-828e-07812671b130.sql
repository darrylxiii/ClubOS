-- Fix security issues identified in security scan

-- 1. Fix the refresh_analytics_views function to include search_path
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_user_segments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_feature_usage_summary;
END;
$$;

-- 2. Recreate error_analytics_summary view with security_invoker=true
DROP VIEW IF EXISTS public.error_analytics_summary;

CREATE VIEW public.error_analytics_summary 
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('day'::text, created_at) AS date,
  severity,
  error_type,
  count(*) AS error_count,
  count(*) FILTER (WHERE resolved = true) AS resolved_count,
  avg(EXTRACT(epoch FROM resolved_at - created_at) / 3600::numeric) FILTER (WHERE resolved = true) AS avg_resolution_hours
FROM error_logs
WHERE created_at > (now() - '30 days'::interval)
GROUP BY (date_trunc('day'::text, created_at)), severity, error_type
ORDER BY (date_trunc('day'::text, created_at)) DESC;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.error_analytics_summary TO authenticated;