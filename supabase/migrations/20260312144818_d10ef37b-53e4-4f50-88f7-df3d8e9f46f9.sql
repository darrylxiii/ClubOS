
DROP FUNCTION IF EXISTS public.get_pipeline_velocity_metrics();

CREATE OR REPLACE FUNCTION public.get_pipeline_velocity_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  stage_dist jsonb;
  conv_rates jsonb;
  win_rate_val numeric;
  avg_days_val numeric;
  total_history int;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(sd)::jsonb ORDER BY sd.stage_order), '[]'::jsonb)
  INTO stage_dist
  FROM (
    SELECT
      ds.name AS stage_name,
      ds.stage_order,
      ds.probability_weight,
      ds.color,
      COUNT(j.id)::int AS job_count,
      COALESCE(SUM(
        COALESCE(j.deal_value_override,
          COALESCE(j.salary_max, j.salary_min, 60000) * COALESCE(c.placement_fee_percentage, 0) / 100.0
        ) * ds.probability_weight / 100.0
      ), 0)::numeric AS weighted_value
    FROM deal_stages ds
    LEFT JOIN jobs j ON LOWER(j.deal_stage) = LOWER(ds.name)
      AND j.status IN ('published', 'closed')
      AND j.is_lost = false
    LEFT JOIN companies c ON c.id = j.company_id
    GROUP BY ds.name, ds.stage_order, ds.probability_weight, ds.color
  ) sd;

  SELECT COALESCE(jsonb_agg(row_to_json(cr)::jsonb), '[]'::jsonb)
  INTO conv_rates
  FROM (
    SELECT
      from_stage,
      to_stage,
      COUNT(*)::int AS transition_count,
      ROUND(AVG(COALESCE(duration_days, 0)))::int AS avg_days
    FROM deal_stage_history
    WHERE LOWER(from_stage) != LOWER(to_stage)
    GROUP BY from_stage, to_stage
  ) cr;

  SELECT ROUND(
    CASE
      WHEN COUNT(*) FILTER (WHERE LOWER(deal_stage) IN ('closed won', 'closed lost')) = 0 THEN 0
      ELSE COUNT(*) FILTER (WHERE LOWER(deal_stage) = 'closed won')::numeric /
           COUNT(*) FILTER (WHERE LOWER(deal_stage) IN ('closed won', 'closed lost'))::numeric * 100
    END
  )
  INTO win_rate_val
  FROM jobs
  WHERE status = 'closed';

  SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, updated_at) - created_at)) / 86400)), 0)
  INTO avg_days_val
  FROM jobs
  WHERE LOWER(deal_stage) = 'closed won' AND status = 'closed';

  SELECT COUNT(*)::int INTO total_history FROM deal_stage_history;

  result := jsonb_build_object(
    'stage_distribution', stage_dist,
    'conversion_rates', conv_rates,
    'win_rate', COALESCE(win_rate_val, 0),
    'avg_days_to_close', COALESCE(avg_days_val, 0),
    'total_history_records', COALESCE(total_history, 0)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(COALESCE(OLD.deal_stage, '')) = LOWER(COALESCE(NEW.deal_stage, '')) THEN
    RETURN NEW;
  END IF;

  INSERT INTO deal_stage_history (job_id, from_stage, to_stage, changed_by, duration_days)
  VALUES (
    NEW.id,
    COALESCE(OLD.deal_stage, 'New'),
    NEW.deal_stage,
    auth.uid(),
    EXTRACT(EPOCH FROM (now() - COALESCE(OLD.updated_at, OLD.created_at))) / 86400
  );

  RETURN NEW;
END;
$$;
