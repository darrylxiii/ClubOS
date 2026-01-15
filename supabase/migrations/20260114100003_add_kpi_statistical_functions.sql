-- ============================================
-- KPI Statistical Analysis Functions
-- ============================================
-- Functions for data science: z-scores, percentiles, anomaly detection,
-- trend analysis, and forecasting support.

-- 1. Calculate Z-Score for a KPI value
-- Used for anomaly detection and statistical analysis
CREATE OR REPLACE FUNCTION public.calculate_kpi_zscore(
  p_kpi_name text,
  p_domain text,
  p_current_value numeric,
  p_lookback_days integer DEFAULT 30
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mean numeric;
  v_stddev numeric;
  v_zscore numeric;
BEGIN
  SELECT
    AVG(value),
    STDDEV_POP(value)
  INTO v_mean, v_stddev
  FROM kpi_daily_snapshots
  WHERE kpi_name = p_kpi_name
    AND domain = p_domain
    AND snapshot_date > CURRENT_DATE - p_lookback_days;

  IF v_stddev IS NULL OR v_stddev = 0 THEN
    RETURN 0;
  END IF;

  v_zscore := (p_current_value - v_mean) / v_stddev;
  RETURN ROUND(v_zscore, 4);
END;
$$;

-- 2. Calculate Percentile Rank for a KPI value
CREATE OR REPLACE FUNCTION public.calculate_kpi_percentile(
  p_kpi_name text,
  p_domain text,
  p_current_value numeric,
  p_lookback_days integer DEFAULT 90
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percentile numeric;
  v_total_count integer;
  v_below_count integer;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE value < p_current_value)
  INTO v_total_count, v_below_count
  FROM kpi_daily_snapshots
  WHERE kpi_name = p_kpi_name
    AND domain = p_domain
    AND snapshot_date > CURRENT_DATE - p_lookback_days;

  IF v_total_count = 0 THEN
    RETURN 50; -- Default to median if no data
  END IF;

  v_percentile := (v_below_count::numeric / v_total_count) * 100;
  RETURN ROUND(v_percentile, 2);
END;
$$;

-- 3. Detect Anomalies in KPI Data
-- Returns anomalies based on z-score threshold
CREATE OR REPLACE FUNCTION public.detect_kpi_anomalies(
  p_date date DEFAULT CURRENT_DATE,
  p_zscore_threshold numeric DEFAULT 2.0,
  p_min_data_points integer DEFAULT 7
)
RETURNS TABLE (
  kpi_name text,
  domain text,
  current_value numeric,
  expected_value numeric,
  z_score numeric,
  percentile_rank numeric,
  anomaly_type text,
  severity text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH kpi_stats AS (
    SELECT
      s.kpi_name,
      s.domain,
      s.value as current_value,
      AVG(h.value) as mean_value,
      STDDEV_POP(h.value) as stddev_value,
      COUNT(h.id) as data_points
    FROM kpi_daily_snapshots s
    JOIN kpi_daily_snapshots h
      ON s.kpi_name = h.kpi_name
      AND s.domain = h.domain
      AND h.snapshot_date BETWEEN p_date - 30 AND p_date - 1
    WHERE s.snapshot_date = p_date
    GROUP BY s.kpi_name, s.domain, s.value
    HAVING COUNT(h.id) >= p_min_data_points
  )
  SELECT
    ks.kpi_name,
    ks.domain,
    ks.current_value,
    ROUND(ks.mean_value, 2) as expected_value,
    ROUND(
      CASE WHEN ks.stddev_value > 0
      THEN (ks.current_value - ks.mean_value) / ks.stddev_value
      ELSE 0 END, 4
    ) as z_score,
    calculate_kpi_percentile(ks.kpi_name, ks.domain, ks.current_value) as percentile_rank,
    CASE
      WHEN (ks.current_value - ks.mean_value) / NULLIF(ks.stddev_value, 0) > p_zscore_threshold THEN 'spike'
      WHEN (ks.current_value - ks.mean_value) / NULLIF(ks.stddev_value, 0) < -p_zscore_threshold THEN 'drop'
      ELSE 'normal'
    END as anomaly_type,
    CASE
      WHEN ABS((ks.current_value - ks.mean_value) / NULLIF(ks.stddev_value, 0)) > 3 THEN 'critical'
      WHEN ABS((ks.current_value - ks.mean_value) / NULLIF(ks.stddev_value, 0)) > 2 THEN 'warning'
      ELSE 'info'
    END as severity
  FROM kpi_stats ks
  WHERE ABS((ks.current_value - ks.mean_value) / NULLIF(ks.stddev_value, 0)) > p_zscore_threshold;
END;
$$;

-- 4. Update KPI Snapshots with Statistical Metrics
-- Call this after generating daily snapshots
CREATE OR REPLACE FUNCTION public.update_kpi_snapshot_statistics(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  -- Update z-scores and percentiles
  UPDATE kpi_daily_snapshots s
  SET
    z_score = calculate_kpi_zscore(s.kpi_name, s.domain, s.value, 30),
    percentile_rank = calculate_kpi_percentile(s.kpi_name, s.domain, s.value, 90)
  WHERE s.snapshot_date = p_date;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Mark anomalies
  UPDATE kpi_daily_snapshots s
  SET
    is_anomaly = true,
    anomaly_type = CASE
      WHEN s.z_score > 2 THEN 'spike'
      WHEN s.z_score < -2 THEN 'drop'
      ELSE 'trend_break'
    END
  WHERE s.snapshot_date = p_date
    AND ABS(s.z_score) > 2;

  RETURN jsonb_build_object(
    'success', true,
    'date', p_date,
    'records_updated', v_updated_count,
    'updated_at', now()
  );
END;
$$;

-- 5. Get KPI Statistical Summary
CREATE OR REPLACE FUNCTION public.get_kpi_statistics(
  p_kpi_name text,
  p_domain text,
  p_lookback_days integer DEFAULT 90
)
RETURNS TABLE (
  kpi_name text,
  domain text,
  current_value numeric,
  mean_value numeric,
  median_value numeric,
  min_value numeric,
  max_value numeric,
  stddev_value numeric,
  variance_value numeric,
  data_points bigint,
  trend_direction text,
  trend_slope numeric,
  volatility_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      s.kpi_name,
      s.domain,
      s.value,
      s.snapshot_date,
      ROW_NUMBER() OVER (ORDER BY s.snapshot_date DESC) as rn
    FROM kpi_daily_snapshots s
    WHERE s.kpi_name = p_kpi_name
      AND s.domain = p_domain
      AND s.snapshot_date > CURRENT_DATE - p_lookback_days
  ),
  aggregates AS (
    SELECT
      MAX(CASE WHEN rn = 1 THEN value END) as current_val,
      AVG(value) as mean_val,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_val,
      MIN(value) as min_val,
      MAX(value) as max_val,
      STDDEV_POP(value) as stddev_val,
      VAR_POP(value) as var_val,
      COUNT(*) as cnt,
      -- Calculate trend using linear regression
      REGR_SLOPE(value, EXTRACT(EPOCH FROM snapshot_date)) as slope
    FROM stats
  ),
  recent_trend AS (
    SELECT
      CASE
        WHEN AVG(value) FILTER (WHERE rn <= 7) > AVG(value) FILTER (WHERE rn > 7 AND rn <= 14) * 1.05 THEN 'up'
        WHEN AVG(value) FILTER (WHERE rn <= 7) < AVG(value) FILTER (WHERE rn > 7 AND rn <= 14) * 0.95 THEN 'down'
        ELSE 'stable'
      END as direction
    FROM stats
  )
  SELECT
    p_kpi_name as kpi_name,
    p_domain as domain,
    ROUND(a.current_val, 2) as current_value,
    ROUND(a.mean_val, 2) as mean_value,
    ROUND(a.median_val, 2) as median_value,
    ROUND(a.min_val, 2) as min_value,
    ROUND(a.max_val, 2) as max_value,
    ROUND(a.stddev_val, 4) as stddev_value,
    ROUND(a.var_val, 4) as variance_value,
    a.cnt as data_points,
    rt.direction as trend_direction,
    ROUND(a.slope * 86400, 4) as trend_slope, -- Per day change
    ROUND(
      CASE WHEN a.mean_val != 0
      THEN (a.stddev_val / ABS(a.mean_val)) * 100
      ELSE 0 END, 2
    ) as volatility_score
  FROM aggregates a
  CROSS JOIN recent_trend rt;
END;
$$;

-- 6. Get Moving Averages for a KPI
CREATE OR REPLACE FUNCTION public.get_kpi_moving_averages(
  p_kpi_name text,
  p_domain text,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  snapshot_date date,
  value numeric,
  ma_7 numeric,
  ma_14 numeric,
  ma_30 numeric,
  ema_7 numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.snapshot_date,
    s.value,
    ROUND(AVG(s.value) OVER (
      ORDER BY s.snapshot_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) as ma_7,
    ROUND(AVG(s.value) OVER (
      ORDER BY s.snapshot_date
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    ), 2) as ma_14,
    ROUND(AVG(s.value) OVER (
      ORDER BY s.snapshot_date
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ), 2) as ma_30,
    -- Exponential moving average approximation
    ROUND(
      SUM(s.value * POWER(0.8, ROW_NUMBER() OVER (ORDER BY s.snapshot_date DESC) - 1)) OVER (
        ORDER BY s.snapshot_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
      ) /
      SUM(POWER(0.8, ROW_NUMBER() OVER (ORDER BY s.snapshot_date DESC) - 1)) OVER (
        ORDER BY s.snapshot_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
      ), 2
    ) as ema_7
  FROM kpi_daily_snapshots s
  WHERE s.kpi_name = p_kpi_name
    AND s.domain = p_domain
    AND s.snapshot_date > CURRENT_DATE - p_days
  ORDER BY s.snapshot_date;
END;
$$;

-- 7. Forecast KPI Value (Simple Linear Regression)
CREATE OR REPLACE FUNCTION public.forecast_kpi_value(
  p_kpi_name text,
  p_domain text,
  p_days_ahead integer DEFAULT 7,
  p_lookback_days integer DEFAULT 30
)
RETURNS TABLE (
  forecast_date date,
  predicted_value numeric,
  lower_bound numeric,
  upper_bound numeric,
  confidence numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slope numeric;
  v_intercept numeric;
  v_stddev numeric;
  v_r_squared numeric;
  v_base_epoch numeric;
BEGIN
  -- Get linear regression parameters
  SELECT
    REGR_SLOPE(value, EXTRACT(EPOCH FROM snapshot_date)),
    REGR_INTERCEPT(value, EXTRACT(EPOCH FROM snapshot_date)),
    STDDEV_POP(value),
    POWER(CORR(value, EXTRACT(EPOCH FROM snapshot_date)), 2)
  INTO v_slope, v_intercept, v_stddev, v_r_squared
  FROM kpi_daily_snapshots
  WHERE kpi_name = p_kpi_name
    AND domain = p_domain
    AND snapshot_date > CURRENT_DATE - p_lookback_days;

  -- Return forecasts
  RETURN QUERY
  SELECT
    (CURRENT_DATE + d)::date as forecast_date,
    ROUND(
      v_intercept + v_slope * EXTRACT(EPOCH FROM (CURRENT_DATE + d)::timestamp), 2
    ) as predicted_value,
    ROUND(
      (v_intercept + v_slope * EXTRACT(EPOCH FROM (CURRENT_DATE + d)::timestamp)) - 1.96 * COALESCE(v_stddev, 0), 2
    ) as lower_bound,
    ROUND(
      (v_intercept + v_slope * EXTRACT(EPOCH FROM (CURRENT_DATE + d)::timestamp)) + 1.96 * COALESCE(v_stddev, 0), 2
    ) as upper_bound,
    ROUND(COALESCE(v_r_squared, 0) * 100, 2) as confidence
  FROM generate_series(1, p_days_ahead) as d;
END;
$$;

-- 8. Correlation Analysis Between KPIs
CREATE OR REPLACE FUNCTION public.get_kpi_correlations(
  p_kpi_name text,
  p_domain text,
  p_lookback_days integer DEFAULT 30,
  p_min_correlation numeric DEFAULT 0.5
)
RETURNS TABLE (
  correlated_kpi text,
  correlated_domain text,
  correlation_coefficient numeric,
  correlation_strength text,
  data_points bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH base_kpi AS (
    SELECT snapshot_date, value
    FROM kpi_daily_snapshots
    WHERE kpi_name = p_kpi_name
      AND domain = p_domain
      AND snapshot_date > CURRENT_DATE - p_lookback_days
  )
  SELECT
    s.kpi_name as correlated_kpi,
    s.domain as correlated_domain,
    ROUND(CORR(b.value, s.value)::numeric, 4) as correlation_coefficient,
    CASE
      WHEN ABS(CORR(b.value, s.value)) > 0.8 THEN 'strong'
      WHEN ABS(CORR(b.value, s.value)) > 0.5 THEN 'moderate'
      ELSE 'weak'
    END as correlation_strength,
    COUNT(*) as data_points
  FROM kpi_daily_snapshots s
  JOIN base_kpi b ON s.snapshot_date = b.snapshot_date
  WHERE s.kpi_name != p_kpi_name
    AND s.snapshot_date > CURRENT_DATE - p_lookback_days
  GROUP BY s.kpi_name, s.domain
  HAVING ABS(CORR(b.value, s.value)) >= p_min_correlation
    AND COUNT(*) >= 7
  ORDER BY ABS(CORR(b.value, s.value)) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_kpi_zscore TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_kpi_percentile TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_kpi_anomalies TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_kpi_snapshot_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_moving_averages TO authenticated;
GRANT EXECUTE ON FUNCTION public.forecast_kpi_value TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_correlations TO authenticated;

-- Documentation
COMMENT ON FUNCTION public.calculate_kpi_zscore IS
'Calculates the z-score (standard deviations from mean) for a KPI value.';

COMMENT ON FUNCTION public.calculate_kpi_percentile IS
'Calculates where a KPI value ranks historically (0-100 percentile).';

COMMENT ON FUNCTION public.detect_kpi_anomalies IS
'Detects anomalies in KPI data based on z-score threshold. Returns anomaly type and severity.';

COMMENT ON FUNCTION public.get_kpi_statistics IS
'Returns comprehensive statistical summary for a KPI including mean, median, std dev, trend, and volatility.';

COMMENT ON FUNCTION public.get_kpi_moving_averages IS
'Returns KPI values with 7, 14, 30-day moving averages and exponential moving average.';

COMMENT ON FUNCTION public.forecast_kpi_value IS
'Simple linear regression forecast for a KPI with confidence intervals.';

COMMENT ON FUNCTION public.get_kpi_correlations IS
'Finds KPIs that are statistically correlated with the given KPI.';
