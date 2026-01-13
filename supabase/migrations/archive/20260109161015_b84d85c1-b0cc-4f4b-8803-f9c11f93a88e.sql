-- PHASE 1: KPI SYSTEM FOUNDATION (Simplified)

-- Add unique constraints first
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_ownership_unique ON public.kpi_ownership (kpi_name, domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_alert_configs_unique ON public.kpi_alert_configs (kpi_name, domain);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_kpi_history_lookup ON public.kpi_history (kpi_name, domain, recorded_at DESC);

-- Create get_stale_kpis function
CREATE OR REPLACE FUNCTION public.get_stale_kpis(hours_threshold INTEGER DEFAULT 24)
RETURNS TABLE (kpi_name TEXT, domain TEXT, category TEXT, last_updated TIMESTAMPTZ, hours_since_update NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT k.kpi_name::TEXT, COALESCE(k.domain, k.category)::TEXT, k.category::TEXT, k.updated_at, EXTRACT(EPOCH FROM (NOW() - k.updated_at)) / 3600
  FROM public.kpi_metrics k WHERE k.updated_at < NOW() - (hours_threshold || ' hours')::INTERVAL
  UNION ALL
  SELECT s.kpi_name::TEXT, 'sales'::TEXT, s.category::TEXT, s.updated_at, EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 3600
  FROM public.sales_kpi_metrics s WHERE s.updated_at < NOW() - (hours_threshold || ' hours')::INTERVAL
  UNION ALL
  SELECT w.kpi_name::TEXT, 'website'::TEXT, w.category::TEXT, w.updated_at, EXTRACT(EPOCH FROM (NOW() - w.updated_at)) / 3600
  FROM public.web_kpi_metrics w WHERE w.updated_at < NOW() - (hours_threshold || ' hours')::INTERVAL
  ORDER BY hours_since_update DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;