-- ============================================
-- KPI Data Retention & Archival Policy
-- ============================================
-- Implements data lifecycle management for KPI data:
-- - Hot data (0-90 days): Full resolution in main tables
-- - Warm data (90-365 days): Archived to separate tables
-- - Cold data (365+ days): Aggregated to weekly/monthly summaries

-- 1. Create archive table for kpi_history
CREATE TABLE IF NOT EXISTS public.kpi_history_archive (
  LIKE public.kpi_history INCLUDING DEFAULTS INCLUDING CONSTRAINTS
);

-- Add archive metadata columns
ALTER TABLE public.kpi_history_archive
ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS archive_batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_kpi_history_archive_lookup
  ON public.kpi_history_archive (kpi_name, domain, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_history_archive_date
  ON public.kpi_history_archive (recorded_at DESC);

-- 2. Create archive table for kpi_daily_snapshots
CREATE TABLE IF NOT EXISTS public.kpi_snapshots_archive (
  LIKE public.kpi_daily_snapshots INCLUDING DEFAULTS INCLUDING CONSTRAINTS
);

ALTER TABLE public.kpi_snapshots_archive
ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS archive_batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_archive_lookup
  ON public.kpi_snapshots_archive (kpi_name, domain, snapshot_date DESC);

-- 3. Create aggregated summary table for long-term storage
CREATE TABLE IF NOT EXISTS public.kpi_aggregated_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start date NOT NULL,
  period_end date NOT NULL,
  domain text NOT NULL,
  category text NOT NULL,
  kpi_name text NOT NULL,
  -- Aggregated values
  avg_value numeric NOT NULL,
  min_value numeric NOT NULL,
  max_value numeric NOT NULL,
  median_value numeric,
  stddev_value numeric,
  sum_value numeric,
  data_points integer NOT NULL,
  -- Status distribution
  success_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  -- Anomaly summary
  anomaly_count integer DEFAULT 0,
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),

  UNIQUE(period_type, period_start, domain, kpi_name)
);

CREATE INDEX IF NOT EXISTS idx_kpi_aggregated_lookup
  ON public.kpi_aggregated_summaries (domain, kpi_name, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_aggregated_period
  ON public.kpi_aggregated_summaries (period_type, period_start DESC);

-- 4. Enable RLS on archive tables
ALTER TABLE public.kpi_history_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_snapshots_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_aggregated_summaries ENABLE ROW LEVEL SECURITY;

-- Admin read access
CREATE POLICY "kpi_archive_admin_read" ON public.kpi_history_archive
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'role' IN ('admin', 'strategist')
  ));

CREATE POLICY "kpi_snapshots_archive_admin_read" ON public.kpi_snapshots_archive
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'role' IN ('admin', 'strategist')
  ));

CREATE POLICY "kpi_aggregated_admin_read" ON public.kpi_aggregated_summaries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'role' IN ('admin', 'strategist')
  ));

-- Service role full access
CREATE POLICY "kpi_archive_service" ON public.kpi_history_archive
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "kpi_snapshots_archive_service" ON public.kpi_snapshots_archive
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "kpi_aggregated_service" ON public.kpi_aggregated_summaries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Archive old kpi_history data
CREATE OR REPLACE FUNCTION public.archive_old_kpi_history(
  p_retention_days integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_date timestamptz := NOW() - (p_retention_days || ' days')::interval;
  v_batch_id uuid := gen_random_uuid();
  v_archived_count integer;
  v_deleted_count integer;
BEGIN
  -- Move old records to archive
  INSERT INTO kpi_history_archive (
    id, kpi_name, domain, category, value, target_value, status, trend,
    recorded_at, metadata, archived_at, archive_batch_id
  )
  SELECT
    id, kpi_name, domain, category, value, target_value, status, trend,
    recorded_at, metadata, now(), v_batch_id
  FROM kpi_history
  WHERE recorded_at < v_cutoff_date;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Delete from main table
  DELETE FROM kpi_history
  WHERE recorded_at < v_cutoff_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'cutoff_date', v_cutoff_date,
    'archived_count', v_archived_count,
    'deleted_count', v_deleted_count,
    'executed_at', now()
  );
END;
$$;

-- 6. Archive old kpi_daily_snapshots
CREATE OR REPLACE FUNCTION public.archive_old_kpi_snapshots(
  p_retention_days integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_date date := CURRENT_DATE - p_retention_days;
  v_batch_id uuid := gen_random_uuid();
  v_archived_count integer;
  v_deleted_count integer;
BEGIN
  -- Move old records to archive
  INSERT INTO kpi_snapshots_archive
  SELECT *, now() as archived_at, v_batch_id as archive_batch_id
  FROM kpi_daily_snapshots
  WHERE snapshot_date < v_cutoff_date;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Delete from main table
  DELETE FROM kpi_daily_snapshots
  WHERE snapshot_date < v_cutoff_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'cutoff_date', v_cutoff_date,
    'archived_count', v_archived_count,
    'deleted_count', v_deleted_count,
    'executed_at', now()
  );
END;
$$;

-- 7. Generate aggregated summaries from archive data
CREATE OR REPLACE FUNCTION public.generate_kpi_aggregated_summaries(
  p_period_type text DEFAULT 'weekly',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date := COALESCE(p_start_date, CURRENT_DATE - 365);
  v_end_date date := COALESCE(p_end_date, CURRENT_DATE - 90);
  v_inserted_count integer;
BEGIN
  -- Generate weekly summaries
  IF p_period_type = 'weekly' THEN
    INSERT INTO kpi_aggregated_summaries (
      period_type, period_start, period_end, domain, category, kpi_name,
      avg_value, min_value, max_value, median_value, stddev_value, sum_value,
      data_points, success_count, warning_count, critical_count, anomaly_count
    )
    SELECT
      'weekly' as period_type,
      DATE_TRUNC('week', snapshot_date)::date as period_start,
      (DATE_TRUNC('week', snapshot_date) + INTERVAL '6 days')::date as period_end,
      domain,
      category,
      kpi_name,
      AVG(value) as avg_value,
      MIN(value) as min_value,
      MAX(value) as max_value,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
      STDDEV_POP(value) as stddev_value,
      SUM(value) as sum_value,
      COUNT(*) as data_points,
      COUNT(*) FILTER (WHERE status = 'success') as success_count,
      COUNT(*) FILTER (WHERE status = 'warning') as warning_count,
      COUNT(*) FILTER (WHERE status = 'critical') as critical_count,
      COUNT(*) FILTER (WHERE is_anomaly) as anomaly_count
    FROM kpi_snapshots_archive
    WHERE snapshot_date BETWEEN v_start_date AND v_end_date
    GROUP BY DATE_TRUNC('week', snapshot_date), domain, category, kpi_name
    ON CONFLICT (period_type, period_start, domain, kpi_name)
    DO UPDATE SET
      avg_value = EXCLUDED.avg_value,
      min_value = EXCLUDED.min_value,
      max_value = EXCLUDED.max_value,
      median_value = EXCLUDED.median_value,
      stddev_value = EXCLUDED.stddev_value,
      sum_value = EXCLUDED.sum_value,
      data_points = EXCLUDED.data_points,
      success_count = EXCLUDED.success_count,
      warning_count = EXCLUDED.warning_count,
      critical_count = EXCLUDED.critical_count,
      anomaly_count = EXCLUDED.anomaly_count;

  -- Generate monthly summaries
  ELSIF p_period_type = 'monthly' THEN
    INSERT INTO kpi_aggregated_summaries (
      period_type, period_start, period_end, domain, category, kpi_name,
      avg_value, min_value, max_value, median_value, stddev_value, sum_value,
      data_points, success_count, warning_count, critical_count, anomaly_count
    )
    SELECT
      'monthly' as period_type,
      DATE_TRUNC('month', snapshot_date)::date as period_start,
      (DATE_TRUNC('month', snapshot_date) + INTERVAL '1 month - 1 day')::date as period_end,
      domain,
      category,
      kpi_name,
      AVG(value) as avg_value,
      MIN(value) as min_value,
      MAX(value) as max_value,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
      STDDEV_POP(value) as stddev_value,
      SUM(value) as sum_value,
      COUNT(*) as data_points,
      COUNT(*) FILTER (WHERE status = 'success') as success_count,
      COUNT(*) FILTER (WHERE status = 'warning') as warning_count,
      COUNT(*) FILTER (WHERE status = 'critical') as critical_count,
      COUNT(*) FILTER (WHERE is_anomaly) as anomaly_count
    FROM kpi_snapshots_archive
    WHERE snapshot_date BETWEEN v_start_date AND v_end_date
    GROUP BY DATE_TRUNC('month', snapshot_date), domain, category, kpi_name
    ON CONFLICT (period_type, period_start, domain, kpi_name)
    DO UPDATE SET
      avg_value = EXCLUDED.avg_value,
      min_value = EXCLUDED.min_value,
      max_value = EXCLUDED.max_value,
      median_value = EXCLUDED.median_value,
      stddev_value = EXCLUDED.stddev_value,
      sum_value = EXCLUDED.sum_value,
      data_points = EXCLUDED.data_points,
      success_count = EXCLUDED.success_count,
      warning_count = EXCLUDED.warning_count,
      critical_count = EXCLUDED.critical_count,
      anomaly_count = EXCLUDED.anomaly_count;
  END IF;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'period_type', p_period_type,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'records_processed', v_inserted_count,
    'executed_at', now()
  );
END;
$$;

-- 8. Master data lifecycle function
CREATE OR REPLACE FUNCTION public.run_kpi_data_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results jsonb := '{}'::jsonb;
BEGIN
  -- Step 1: Archive old history (90 days)
  v_results := v_results || jsonb_build_object(
    'archive_history', archive_old_kpi_history(90)
  );

  -- Step 2: Archive old snapshots (90 days)
  v_results := v_results || jsonb_build_object(
    'archive_snapshots', archive_old_kpi_snapshots(90)
  );

  -- Step 3: Generate weekly aggregates
  v_results := v_results || jsonb_build_object(
    'weekly_aggregates', generate_kpi_aggregated_summaries('weekly')
  );

  -- Step 4: Generate monthly aggregates
  v_results := v_results || jsonb_build_object(
    'monthly_aggregates', generate_kpi_aggregated_summaries('monthly')
  );

  -- Step 5: Clean up very old archive data (365 days)
  DELETE FROM kpi_history_archive
  WHERE recorded_at < NOW() - INTERVAL '365 days';

  DELETE FROM kpi_snapshots_archive
  WHERE snapshot_date < CURRENT_DATE - 365;

  RETURN jsonb_build_object(
    'success', true,
    'results', v_results,
    'executed_at', now()
  );
END;
$$;

-- 9. Query function for historical data (unified view)
CREATE OR REPLACE FUNCTION public.get_kpi_historical_data(
  p_kpi_name text,
  p_domain text,
  p_start_date date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  data_date date,
  value numeric,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Recent data from main table
  SELECT
    snapshot_date as data_date,
    s.value,
    'current' as source
  FROM kpi_daily_snapshots s
  WHERE s.kpi_name = p_kpi_name
    AND s.domain = p_domain
    AND s.snapshot_date BETWEEN p_start_date AND p_end_date

  UNION ALL

  -- Archived data
  SELECT
    snapshot_date as data_date,
    a.value,
    'archive' as source
  FROM kpi_snapshots_archive a
  WHERE a.kpi_name = p_kpi_name
    AND a.domain = p_domain
    AND a.snapshot_date BETWEEN p_start_date AND p_end_date
    AND a.snapshot_date NOT IN (
      SELECT snapshot_date FROM kpi_daily_snapshots
      WHERE kpi_name = p_kpi_name AND domain = p_domain
    )

  UNION ALL

  -- Aggregated data (weekly averages for older periods)
  SELECT
    period_start as data_date,
    avg_value as value,
    'aggregated_' || period_type as source
  FROM kpi_aggregated_summaries
  WHERE kpi_name = p_kpi_name
    AND domain = p_domain
    AND period_start BETWEEN p_start_date AND p_end_date
    AND period_start NOT IN (
      SELECT snapshot_date FROM kpi_daily_snapshots
      WHERE kpi_name = p_kpi_name AND domain = p_domain
      UNION
      SELECT snapshot_date FROM kpi_snapshots_archive
      WHERE kpi_name = p_kpi_name AND domain = p_domain
    )

  ORDER BY data_date;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.archive_old_kpi_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_old_kpi_snapshots TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_kpi_aggregated_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_kpi_data_lifecycle TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_historical_data TO authenticated;

-- Documentation
COMMENT ON TABLE public.kpi_history_archive IS
'Archive storage for KPI history records older than 90 days.';

COMMENT ON TABLE public.kpi_snapshots_archive IS
'Archive storage for KPI daily snapshots older than 90 days.';

COMMENT ON TABLE public.kpi_aggregated_summaries IS
'Aggregated KPI summaries (weekly/monthly) for long-term trend analysis.';

COMMENT ON FUNCTION public.run_kpi_data_lifecycle IS
'Master function to run complete data lifecycle: archive, aggregate, and cleanup.';

COMMENT ON FUNCTION public.get_kpi_historical_data IS
'Unified query for historical KPI data across current, archive, and aggregated tables.';
