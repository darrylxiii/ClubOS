-- ============================================
-- KPI Materialized Views for Performance
-- ============================================
-- This migration creates materialized views for dashboard performance optimization.
-- These views pre-aggregate common queries and refresh on schedule.

-- 1. Domain Health Summary View
-- Used by the KPI Command Center to show domain health scores
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_kpi_domain_health AS
SELECT
  domain,
  COUNT(DISTINCT kpi_name) as total_kpis,
  COUNT(*) FILTER (WHERE status = 'success') as on_target,
  COUNT(*) FILTER (WHERE status = 'warning') as warning,
  COUNT(*) FILTER (WHERE status = 'critical') as critical,
  COUNT(*) FILTER (WHERE status = 'neutral' OR status IS NULL) as neutral,
  ROUND(
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE (
        COUNT(*) FILTER (WHERE status = 'success')::numeric * 100 +
        COUNT(*) FILTER (WHERE status = 'warning')::numeric * 50 +
        COUNT(*) FILTER (WHERE status = 'neutral' OR status IS NULL)::numeric * 75
      ) / COUNT(*)
    END, 2
  ) as health_score,
  MAX(recorded_at) as last_updated
FROM public.kpi_history
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY domain;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_domain_health_domain
  ON public.mv_kpi_domain_health (domain);

-- 2. CRM Report Aggregation View
-- Pre-aggregates CRM data for the report builder
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_crm_report_data AS
SELECT
  DATE_TRUNC('day', created_at)::date as report_date,
  stage,
  owner_id,
  source,
  COUNT(*) as prospect_count,
  SUM(COALESCE((metadata->>'deal_value')::numeric, 0)) as total_value,
  AVG(COALESCE(score, 0)) as avg_score,
  COUNT(*) FILTER (WHERE status = 'won') as deals_won,
  COUNT(*) FILTER (WHERE status = 'lost') as deals_lost
FROM public.crm_prospects
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at)::date, stage, owner_id, source;

CREATE INDEX IF NOT EXISTS idx_mv_crm_report_date
  ON public.mv_crm_report_data (report_date DESC);

CREATE INDEX IF NOT EXISTS idx_mv_crm_report_stage
  ON public.mv_crm_report_data (stage);

CREATE INDEX IF NOT EXISTS idx_mv_crm_report_owner
  ON public.mv_crm_report_data (owner_id);

-- 3. KPI Category Summary View
-- Aggregates KPIs by category for drill-down views
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_kpi_category_summary AS
SELECT
  domain,
  category,
  COUNT(DISTINCT kpi_name) as kpi_count,
  COUNT(*) FILTER (WHERE status = 'success') as on_target,
  COUNT(*) FILTER (WHERE status = 'warning') as warning,
  COUNT(*) FILTER (WHERE status = 'critical') as critical,
  ROUND(AVG(value), 2) as avg_value,
  ROUND(AVG(
    CASE WHEN previous_day_value != 0
    THEN ((value - previous_day_value) / ABS(previous_day_value) * 100)
    ELSE 0 END
  ), 2) as avg_change_pct,
  MAX(created_at) as last_updated
FROM public.kpi_daily_snapshots
WHERE snapshot_date >= CURRENT_DATE - 7
GROUP BY domain, category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_category_summary
  ON public.mv_kpi_category_summary (domain, category);

-- 4. Weekly KPI Trends View
-- Pre-calculated weekly aggregates for trend charts
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_kpi_weekly_trends AS
SELECT
  DATE_TRUNC('week', snapshot_date)::date as week_start,
  domain,
  kpi_name,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  STDDEV(value) as stddev_value,
  COUNT(*) as data_points,
  COUNT(*) FILTER (WHERE is_anomaly) as anomaly_count
FROM public.kpi_daily_snapshots
WHERE snapshot_date > CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', snapshot_date)::date, domain, kpi_name;

CREATE INDEX IF NOT EXISTS idx_mv_weekly_trends_lookup
  ON public.mv_kpi_weekly_trends (domain, kpi_name, week_start DESC);

-- 5. Top Performers View (for leaderboards)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_kpi_top_performers AS
SELECT
  domain,
  kpi_name,
  value as current_value,
  day_over_day_change,
  week_over_week_change,
  month_over_month_change,
  RANK() OVER (PARTITION BY domain ORDER BY day_over_day_change DESC NULLS LAST) as day_rank,
  RANK() OVER (PARTITION BY domain ORDER BY week_over_week_change DESC NULLS LAST) as week_rank
FROM public.kpi_daily_snapshots
WHERE snapshot_date = CURRENT_DATE
  AND day_over_day_change IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mv_top_performers_domain
  ON public.mv_kpi_top_performers (domain, day_rank);

-- 6. Anomaly Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_kpi_anomaly_summary AS
SELECT
  snapshot_date,
  domain,
  COUNT(*) as total_anomalies,
  COUNT(*) FILTER (WHERE anomaly_type = 'spike') as spikes,
  COUNT(*) FILTER (WHERE anomaly_type = 'drop') as drops,
  COUNT(*) FILTER (WHERE anomaly_type = 'trend_break') as trend_breaks,
  array_agg(DISTINCT kpi_name) as affected_kpis
FROM public.kpi_daily_snapshots
WHERE is_anomaly = true
  AND snapshot_date > CURRENT_DATE - 30
GROUP BY snapshot_date, domain;

CREATE INDEX IF NOT EXISTS idx_mv_anomaly_summary_date
  ON public.mv_kpi_anomaly_summary (snapshot_date DESC);

-- 7. Create refresh function
CREATE OR REPLACE FUNCTION public.refresh_kpi_materialized_views()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time timestamptz := clock_timestamp();
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Refresh each view and track timing
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_domain_health;
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_domain_health', 'status', 'success');
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_domain_health', 'status', 'error', 'message', SQLERRM);
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_report_data;
    v_results := v_results || jsonb_build_object('view', 'mv_crm_report_data', 'status', 'success');
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('view', 'mv_crm_report_data', 'status', 'error', 'message', SQLERRM);
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_category_summary;
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_category_summary', 'status', 'success');
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_category_summary', 'status', 'error', 'message', SQLERRM);
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_weekly_trends;
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_weekly_trends', 'status', 'success');
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_weekly_trends', 'status', 'error', 'message', SQLERRM);
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_top_performers;
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_top_performers', 'status', 'success');
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_top_performers', 'status', 'error', 'message', SQLERRM);
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_anomaly_summary;
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_anomaly_summary', 'status', 'success');
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('view', 'mv_kpi_anomaly_summary', 'status', 'error', 'message', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success', true,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::integer,
    'refreshed_at', now(),
    'results', v_results
  );
END;
$$;

-- 8. Grant access to authenticated users for read
GRANT SELECT ON public.mv_kpi_domain_health TO authenticated;
GRANT SELECT ON public.mv_crm_report_data TO authenticated;
GRANT SELECT ON public.mv_kpi_category_summary TO authenticated;
GRANT SELECT ON public.mv_kpi_weekly_trends TO authenticated;
GRANT SELECT ON public.mv_kpi_top_performers TO authenticated;
GRANT SELECT ON public.mv_kpi_anomaly_summary TO authenticated;

-- Documentation
COMMENT ON MATERIALIZED VIEW public.mv_kpi_domain_health IS
'Pre-aggregated domain health scores for the KPI Command Center. Refresh hourly.';

COMMENT ON MATERIALIZED VIEW public.mv_crm_report_data IS
'Pre-aggregated CRM data for the report builder. Refresh hourly.';

COMMENT ON MATERIALIZED VIEW public.mv_kpi_category_summary IS
'KPI aggregations by category for drill-down views. Refresh hourly.';

COMMENT ON MATERIALIZED VIEW public.mv_kpi_weekly_trends IS
'Weekly trend aggregations for historical charts. Refresh daily.';

COMMENT ON MATERIALIZED VIEW public.mv_kpi_top_performers IS
'Top performing KPIs by change percentage. Refresh hourly.';

COMMENT ON MATERIALIZED VIEW public.mv_kpi_anomaly_summary IS
'Summary of detected anomalies by date and domain. Refresh hourly.';

COMMENT ON FUNCTION public.refresh_kpi_materialized_views IS
'Refreshes all KPI materialized views. Call via cron or manually.';
