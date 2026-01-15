-- ============================================
-- KPI Daily Snapshots for Data Science
-- ============================================
-- This migration creates infrastructure for storing daily KPI snapshots
-- optimized for data science queries, trend analysis, and historical reporting.

-- 1. Create the daily snapshots table
CREATE TABLE IF NOT EXISTS public.kpi_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  domain text NOT NULL,
  category text NOT NULL,
  kpi_name text NOT NULL,
  value numeric NOT NULL,
  target_value numeric,
  previous_day_value numeric,
  day_over_day_change numeric,        -- Percentage change from previous day
  week_over_week_change numeric,       -- Percentage change from 7 days ago
  month_over_month_change numeric,     -- Percentage change from 30 days ago
  status text,                         -- success, warning, critical, neutral
  percentile_rank numeric,             -- Where this value ranks historically (0-100)
  z_score numeric,                     -- Statistical deviation from mean
  is_anomaly boolean DEFAULT false,    -- Flagged by anomaly detection
  anomaly_type text,                   -- spike, drop, trend_break, etc.
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),

  -- Unique constraint for one record per KPI per day per domain
  UNIQUE(snapshot_date, domain, kpi_name)
);

-- 2. Create optimized indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_date
  ON public.kpi_daily_snapshots (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_domain_kpi
  ON public.kpi_daily_snapshots (domain, kpi_name);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_lookup
  ON public.kpi_daily_snapshots (kpi_name, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_anomalies
  ON public.kpi_daily_snapshots (is_anomaly, snapshot_date DESC)
  WHERE is_anomaly = true;

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_status
  ON public.kpi_daily_snapshots (status, snapshot_date DESC);

-- Partial index for recent data (most common queries)
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_recent
  ON public.kpi_daily_snapshots (domain, kpi_name, snapshot_date DESC)
  WHERE snapshot_date > CURRENT_DATE - INTERVAL '90 days';

-- 3. Enable RLS
ALTER TABLE public.kpi_daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin and strategist read access
CREATE POLICY "kpi_snapshots_admin_read" ON public.kpi_daily_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('admin', 'strategist')
    )
  );

-- Admin insert/update for snapshot generation
CREATE POLICY "kpi_snapshots_admin_write" ON public.kpi_daily_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Service role full access (for edge functions)
CREATE POLICY "kpi_snapshots_service_role" ON public.kpi_daily_snapshots
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Create the snapshot generation function
CREATE OR REPLACE FUNCTION public.generate_daily_kpi_snapshot(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
  v_result jsonb;
BEGIN
  -- Insert/update snapshots from operations KPIs
  INSERT INTO kpi_daily_snapshots (
    snapshot_date, domain, category, kpi_name, value, target_value, status, metadata
  )
  SELECT
    p_date,
    'operations',
    category,
    kpi_name,
    value,
    NULL,
    CASE
      WHEN previous_value IS NOT NULL AND value >= previous_value THEN 'success'
      WHEN previous_value IS NOT NULL AND value < previous_value * 0.9 THEN 'critical'
      WHEN previous_value IS NOT NULL THEN 'warning'
      ELSE 'neutral'
    END,
    COALESCE(metadata, '{}'::jsonb)
  FROM kpi_metrics
  WHERE DATE(created_at) >= p_date - INTERVAL '1 day'
    AND DATE(created_at) <= p_date
  ON CONFLICT (snapshot_date, domain, kpi_name)
  DO UPDATE SET
    value = EXCLUDED.value,
    target_value = EXCLUDED.target_value,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- Insert/update snapshots from sales KPIs
  INSERT INTO kpi_daily_snapshots (
    snapshot_date, domain, category, kpi_name, value, target_value, status, metadata
  )
  SELECT
    p_date,
    'sales',
    category,
    kpi_name,
    value,
    target_value,
    CASE
      WHEN target_value IS NOT NULL AND value >= target_value THEN 'success'
      WHEN threshold_critical IS NOT NULL AND value <= threshold_critical THEN 'critical'
      WHEN threshold_warning IS NOT NULL AND value <= threshold_warning THEN 'warning'
      ELSE 'neutral'
    END,
    COALESCE(metadata, '{}'::jsonb)
  FROM sales_kpi_metrics
  WHERE DATE(created_at) >= p_date - INTERVAL '1 day'
    AND DATE(created_at) <= p_date
  ON CONFLICT (snapshot_date, domain, kpi_name)
  DO UPDATE SET
    value = EXCLUDED.value,
    target_value = EXCLUDED.target_value,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_inserted_count := v_inserted_count + v_updated_count;

  -- Insert/update snapshots from website KPIs
  INSERT INTO kpi_daily_snapshots (
    snapshot_date, domain, category, kpi_name, value, target_value, status, metadata
  )
  SELECT
    p_date,
    'website',
    category,
    kpi_name,
    value,
    target_value,
    CASE
      WHEN target_value IS NOT NULL AND value >= target_value THEN 'success'
      WHEN threshold_critical IS NOT NULL AND value <= threshold_critical THEN 'critical'
      WHEN threshold_warning IS NOT NULL AND value <= threshold_warning THEN 'warning'
      ELSE 'neutral'
    END,
    COALESCE(metadata, '{}'::jsonb)
  FROM web_kpi_metrics
  WHERE period_date = p_date OR period_date = p_date - 1
  ON CONFLICT (snapshot_date, domain, kpi_name)
  DO UPDATE SET
    value = EXCLUDED.value,
    target_value = EXCLUDED.target_value,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_inserted_count := v_inserted_count + v_updated_count;

  -- Calculate day-over-day changes
  UPDATE kpi_daily_snapshots s
  SET
    previous_day_value = prev.value,
    day_over_day_change = CASE
      WHEN prev.value IS NOT NULL AND prev.value != 0
      THEN ROUND(((s.value - prev.value) / ABS(prev.value) * 100)::numeric, 2)
      ELSE NULL
    END
  FROM kpi_daily_snapshots prev
  WHERE s.snapshot_date = p_date
    AND prev.kpi_name = s.kpi_name
    AND prev.domain = s.domain
    AND prev.snapshot_date = p_date - 1;

  -- Calculate week-over-week changes
  UPDATE kpi_daily_snapshots s
  SET
    week_over_week_change = CASE
      WHEN prev.value IS NOT NULL AND prev.value != 0
      THEN ROUND(((s.value - prev.value) / ABS(prev.value) * 100)::numeric, 2)
      ELSE NULL
    END
  FROM kpi_daily_snapshots prev
  WHERE s.snapshot_date = p_date
    AND prev.kpi_name = s.kpi_name
    AND prev.domain = s.domain
    AND prev.snapshot_date = p_date - 7;

  -- Calculate month-over-month changes
  UPDATE kpi_daily_snapshots s
  SET
    month_over_month_change = CASE
      WHEN prev.value IS NOT NULL AND prev.value != 0
      THEN ROUND(((s.value - prev.value) / ABS(prev.value) * 100)::numeric, 2)
      ELSE NULL
    END
  FROM kpi_daily_snapshots prev
  WHERE s.snapshot_date = p_date
    AND prev.kpi_name = s.kpi_name
    AND prev.domain = s.domain
    AND prev.snapshot_date = p_date - 30;

  v_result := jsonb_build_object(
    'success', true,
    'snapshot_date', p_date,
    'records_processed', v_inserted_count,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

-- 5. Create function to backfill historical snapshots
CREATE OR REPLACE FUNCTION public.backfill_kpi_snapshots(
  p_start_date date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date date := p_start_date;
  v_total_records integer := 0;
  v_day_result jsonb;
BEGIN
  WHILE v_current_date <= p_end_date LOOP
    v_day_result := generate_daily_kpi_snapshot(v_current_date);
    v_total_records := v_total_records + (v_day_result->>'records_processed')::integer;
    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'total_records', v_total_records,
    'generated_at', now()
  );
END;
$$;

-- 6. Create helper function to get KPI trend data for charts
CREATE OR REPLACE FUNCTION public.get_kpi_trend(
  p_kpi_name text,
  p_domain text,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  snapshot_date date,
  value numeric,
  day_over_day_change numeric,
  status text,
  is_anomaly boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.snapshot_date,
    s.value,
    s.day_over_day_change,
    s.status,
    s.is_anomaly
  FROM kpi_daily_snapshots s
  WHERE s.kpi_name = p_kpi_name
    AND s.domain = p_domain
    AND s.snapshot_date > CURRENT_DATE - p_days
  ORDER BY s.snapshot_date ASC;
$$;

-- 7. Create function to get domain summary statistics
CREATE OR REPLACE FUNCTION public.get_kpi_domain_summary(p_domain text DEFAULT NULL)
RETURNS TABLE (
  domain text,
  total_kpis bigint,
  on_target bigint,
  warning bigint,
  critical bigint,
  health_score numeric,
  avg_day_change numeric,
  last_updated timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.domain,
    COUNT(DISTINCT s.kpi_name) as total_kpis,
    COUNT(*) FILTER (WHERE s.status = 'success') as on_target,
    COUNT(*) FILTER (WHERE s.status = 'warning') as warning,
    COUNT(*) FILTER (WHERE s.status = 'critical') as critical,
    ROUND(
      (COUNT(*) FILTER (WHERE s.status = 'success')::numeric * 100 +
       COUNT(*) FILTER (WHERE s.status = 'warning')::numeric * 50) /
      NULLIF(COUNT(*), 0), 2
    ) as health_score,
    ROUND(AVG(s.day_over_day_change), 2) as avg_day_change,
    MAX(s.created_at) as last_updated
  FROM kpi_daily_snapshots s
  WHERE s.snapshot_date = CURRENT_DATE
    AND (p_domain IS NULL OR s.domain = p_domain)
  GROUP BY s.domain;
$$;

-- Add documentation
COMMENT ON TABLE public.kpi_daily_snapshots IS
'Stores daily KPI snapshots for historical analysis, data science, and trend reporting. Each row represents a single KPI value for a specific date.';

COMMENT ON FUNCTION public.generate_daily_kpi_snapshot IS
'Generates daily snapshots from all KPI tables (kpi_metrics, sales_kpi_metrics, web_kpi_metrics) and calculates period-over-period changes.';

COMMENT ON FUNCTION public.backfill_kpi_snapshots IS
'Backfills historical KPI snapshots for a date range. Useful for initializing data or recovering from gaps.';

COMMENT ON FUNCTION public.get_kpi_trend IS
'Returns time-series data for a specific KPI, optimized for chart rendering.';

COMMENT ON FUNCTION public.get_kpi_domain_summary IS
'Returns aggregated health statistics for KPI domains, used by the Command Center dashboard.';
