-- Fix security definer view issue: pipeline_conversion_metrics
-- The view was created without security_invoker=true, making it SECURITY DEFINER by default
-- This violates security best practices as it bypasses RLS of the querying user

DROP VIEW IF EXISTS public.pipeline_conversion_metrics;

CREATE VIEW public.pipeline_conversion_metrics
WITH (security_invoker=true)
AS
SELECT 
  from_stage,
  to_stage,
  COUNT(*) as conversion_count,
  AVG(EXTRACT(epoch FROM (conversion_timestamp - created_at)) / 86400.0)::numeric(10,2) as avg_days_to_convert,
  (COUNT(*) * 100.0 / NULLIF(
    (SELECT COUNT(*) FROM deal_stage_conversions sc2 
     WHERE sc2.from_stage = sc1.from_stage), 0
  ))::numeric(5,2) as conversion_rate_pct
FROM deal_stage_conversions sc1
GROUP BY from_stage, to_stage
ORDER BY from_stage, to_stage;