-- ============================================
-- KPI Scheduled Jobs with pg_cron
-- ============================================
-- Sets up automated scheduling for KPI calculations and maintenance:
-- - Daily KPI snapshot generation
-- - Hourly materialized view refresh
-- - Daily anomaly detection
-- - Weekly data archival
-- - Monthly aggregation generation

-- Note: pg_cron must be enabled in your Supabase project settings
-- Go to Database > Extensions and enable pg_cron

-- 1. Enable pg_cron extension (requires superuser or dashboard)
-- This is typically done via dashboard, but we attempt it here
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron extension must be enabled via Supabase Dashboard > Database > Extensions';
END
$$;

-- 2. Enable pg_net extension for HTTP calls (typically already enabled)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_net extension must be enabled via Supabase Dashboard > Database > Extensions';
END
$$;

-- 3. Create a table to store scheduled job configurations
CREATE TABLE IF NOT EXISTS public.kpi_scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL UNIQUE,
  job_type text NOT NULL, -- 'cron' or 'interval'
  schedule text NOT NULL, -- cron expression or interval
  function_name text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,
  last_run_duration_ms integer,
  error_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_scheduled_jobs_active
  ON public.kpi_scheduled_jobs (is_active, job_name);

-- 4. Create job execution log
CREATE TABLE IF NOT EXISTS public.kpi_job_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.kpi_scheduled_jobs(id),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
  result jsonb,
  error_message text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_job_executions_job
  ON public.kpi_job_executions (job_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_job_executions_status
  ON public.kpi_job_executions (status, started_at DESC);

-- 5. RLS policies
ALTER TABLE public.kpi_scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_job_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_jobs_admin_read" ON public.kpi_scheduled_jobs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'role' IN ('admin', 'strategist')
  ));

CREATE POLICY "kpi_jobs_service" ON public.kpi_scheduled_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "kpi_executions_admin_read" ON public.kpi_job_executions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.raw_user_meta_data->>'role' IN ('admin', 'strategist')
  ));

CREATE POLICY "kpi_executions_service" ON public.kpi_job_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Insert default job configurations
INSERT INTO public.kpi_scheduled_jobs (job_name, job_type, schedule, function_name, parameters)
VALUES
  -- Daily KPI snapshot at 6:00 AM UTC
  ('daily_kpi_snapshot', 'cron', '0 6 * * *', 'generate_daily_kpi_snapshot', '{}'),

  -- Hourly materialized view refresh
  ('hourly_view_refresh', 'cron', '0 * * * *', 'refresh_kpi_materialized_views', '{}'),

  -- Daily anomaly detection at 7:00 AM UTC (after snapshots)
  ('daily_anomaly_detection', 'cron', '0 7 * * *', 'detect_kpi_anomalies', '{"z_score_threshold": 2.0}'),

  -- Update snapshot statistics at 7:30 AM UTC
  ('daily_statistics_update', 'cron', '30 7 * * *', 'update_kpi_snapshot_statistics', '{}'),

  -- Weekly data archival on Sundays at 2:00 AM UTC
  ('weekly_data_archive', 'cron', '0 2 * * 0', 'run_kpi_data_lifecycle', '{}'),

  -- Monthly aggregation on 1st of month at 3:00 AM UTC
  ('monthly_aggregation', 'cron', '0 3 1 * *', 'generate_kpi_aggregated_summaries', '{"period_type": "monthly"}'),

  -- Weekly aggregation on Mondays at 3:30 AM UTC
  ('weekly_aggregation', 'cron', '30 3 * * 1', 'generate_kpi_aggregated_summaries', '{"period_type": "weekly"}')
ON CONFLICT (job_name) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  function_name = EXCLUDED.function_name,
  parameters = EXCLUDED.parameters,
  updated_at = now();

-- 7. Function to execute a scheduled job
CREATE OR REPLACE FUNCTION public.execute_kpi_job(p_job_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  v_execution_id uuid;
  v_start_time timestamptz := clock_timestamp();
  v_result jsonb;
  v_error_message text;
  v_duration_ms integer;
BEGIN
  -- Get job configuration
  SELECT * INTO v_job
  FROM kpi_scheduled_jobs
  WHERE job_name = p_job_name AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Job not found or inactive: ' || p_job_name
    );
  END IF;

  -- Create execution record
  INSERT INTO kpi_job_executions (job_id, job_name, started_at, status)
  VALUES (v_job.id, v_job.job_name, v_start_time, 'running')
  RETURNING id INTO v_execution_id;

  BEGIN
    -- Execute the appropriate function based on job configuration
    CASE v_job.function_name
      WHEN 'generate_daily_kpi_snapshot' THEN
        PERFORM generate_daily_kpi_snapshot();
        v_result := jsonb_build_object('function', 'generate_daily_kpi_snapshot', 'status', 'completed');

      WHEN 'refresh_kpi_materialized_views' THEN
        PERFORM refresh_kpi_materialized_views();
        v_result := jsonb_build_object('function', 'refresh_kpi_materialized_views', 'status', 'completed');

      WHEN 'update_kpi_snapshot_statistics' THEN
        SELECT update_kpi_snapshot_statistics(CURRENT_DATE) INTO v_result;

      WHEN 'run_kpi_data_lifecycle' THEN
        SELECT run_kpi_data_lifecycle() INTO v_result;

      WHEN 'generate_kpi_aggregated_summaries' THEN
        SELECT generate_kpi_aggregated_summaries(
          (v_job.parameters->>'period_type')::text
        ) INTO v_result;

      WHEN 'detect_kpi_anomalies' THEN
        -- This would call the edge function, but we can also use the RPC
        SELECT jsonb_agg(row_to_json(a.*))
        INTO v_result
        FROM detect_kpi_anomalies(
          CURRENT_DATE,
          COALESCE((v_job.parameters->>'z_score_threshold')::numeric, 2.0),
          7
        ) a;

      ELSE
        RAISE EXCEPTION 'Unknown function: %', v_job.function_name;
    END CASE;

    -- Calculate duration
    v_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::integer;

    -- Update execution record with success
    UPDATE kpi_job_executions
    SET
      completed_at = clock_timestamp(),
      status = 'success',
      result = v_result,
      duration_ms = v_duration_ms
    WHERE id = v_execution_id;

    -- Update job record
    UPDATE kpi_scheduled_jobs
    SET
      last_run_at = v_start_time,
      last_run_status = 'success',
      last_run_duration_ms = v_duration_ms,
      updated_at = now()
    WHERE id = v_job.id;

    RETURN jsonb_build_object(
      'success', true,
      'job_name', v_job.job_name,
      'execution_id', v_execution_id,
      'duration_ms', v_duration_ms,
      'result', v_result
    );

  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    v_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::integer;

    -- Update execution record with failure
    UPDATE kpi_job_executions
    SET
      completed_at = clock_timestamp(),
      status = 'failed',
      error_message = v_error_message,
      duration_ms = v_duration_ms
    WHERE id = v_execution_id;

    -- Update job record
    UPDATE kpi_scheduled_jobs
    SET
      last_run_at = v_start_time,
      last_run_status = 'failed',
      last_run_duration_ms = v_duration_ms,
      error_count = error_count + 1,
      updated_at = now()
    WHERE id = v_job.id;

    RETURN jsonb_build_object(
      'success', false,
      'job_name', v_job.job_name,
      'execution_id', v_execution_id,
      'duration_ms', v_duration_ms,
      'error', v_error_message
    );
  END;
END;
$$;

-- 8. Function to run all pending jobs (can be called periodically)
CREATE OR REPLACE FUNCTION public.run_pending_kpi_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  v_results jsonb := '[]'::jsonb;
  v_job_result jsonb;
BEGIN
  FOR v_job IN
    SELECT * FROM kpi_scheduled_jobs
    WHERE is_active = true
    ORDER BY job_name
  LOOP
    v_job_result := execute_kpi_job(v_job.job_name);
    v_results := v_results || v_job_result;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'jobs_executed', jsonb_array_length(v_results),
    'results', v_results,
    'executed_at', now()
  );
END;
$$;

-- 9. Schedule jobs with pg_cron (if extension is available)
-- These will only work if pg_cron is enabled
DO $$
DECLARE
  v_job record;
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing schedules for our jobs
    DELETE FROM cron.job WHERE jobname LIKE 'kpi_%';

    -- Schedule each active job
    FOR v_job IN
      SELECT * FROM kpi_scheduled_jobs WHERE is_active = true
    LOOP
      PERFORM cron.schedule(
        'kpi_' || v_job.job_name,
        v_job.schedule,
        format('SELECT execute_kpi_job(%L)', v_job.job_name)
      );
    END LOOP;

    RAISE NOTICE 'pg_cron jobs scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron not available - jobs configured but not scheduled';
    RAISE NOTICE 'Enable pg_cron in Supabase Dashboard > Database > Extensions';
    RAISE NOTICE 'Or use the kpi-scheduler edge function with external cron';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule pg_cron jobs: %', SQLERRM;
END
$$;

-- 10. Create a view for job status monitoring
CREATE OR REPLACE VIEW public.v_kpi_job_status AS
SELECT
  j.job_name,
  j.schedule,
  j.function_name,
  j.is_active,
  j.last_run_at,
  j.last_run_status,
  j.last_run_duration_ms,
  j.error_count,
  (
    SELECT COUNT(*)
    FROM kpi_job_executions e
    WHERE e.job_id = j.id
    AND e.started_at > NOW() - INTERVAL '24 hours'
  ) as runs_last_24h,
  (
    SELECT COUNT(*)
    FROM kpi_job_executions e
    WHERE e.job_id = j.id
    AND e.status = 'failed'
    AND e.started_at > NOW() - INTERVAL '7 days'
  ) as failures_last_7d
FROM kpi_scheduled_jobs j
ORDER BY j.job_name;

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION public.execute_kpi_job TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_pending_kpi_jobs TO authenticated;
GRANT SELECT ON public.v_kpi_job_status TO authenticated;

-- 12. Documentation
COMMENT ON TABLE public.kpi_scheduled_jobs IS
'Configuration table for scheduled KPI jobs. Used with pg_cron or external scheduler.';

COMMENT ON TABLE public.kpi_job_executions IS
'Execution history for scheduled KPI jobs. Tracks success/failure and performance.';

COMMENT ON FUNCTION public.execute_kpi_job IS
'Execute a single scheduled KPI job by name. Records execution in kpi_job_executions.';

COMMENT ON FUNCTION public.run_pending_kpi_jobs IS
'Execute all active scheduled jobs. Can be called by external cron if pg_cron unavailable.';

COMMENT ON VIEW public.v_kpi_job_status IS
'Dashboard view showing status of all scheduled KPI jobs with recent execution stats.';
