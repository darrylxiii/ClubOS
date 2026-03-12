
-- Phase 3: Create get_pipeline_velocity_metrics RPC
CREATE OR REPLACE FUNCTION public.get_pipeline_velocity_metrics()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'stage_distribution', (
      SELECT COALESCE(json_agg(row_to_json(sd)), '[]'::json)
      FROM (
        SELECT 
          ds.name as stage_name,
          ds.stage_order,
          ds.probability_weight,
          ds.color,
          COUNT(j.id) as job_count,
          COALESCE(SUM(
            COALESCE(j.deal_value_override, 0) * (ds.probability_weight / 100.0)
          ), 0) as weighted_value
        FROM deal_stages ds
        LEFT JOIN jobs j ON LOWER(j.deal_stage) = LOWER(ds.name) 
          AND j.status IN ('published', 'closed')
        GROUP BY ds.name, ds.stage_order, ds.probability_weight, ds.color
        ORDER BY ds.stage_order
      ) sd
    ),
    'conversion_rates', (
      SELECT COALESCE(json_agg(row_to_json(cr)), '[]'::json)
      FROM (
        SELECT 
          h.from_stage,
          h.to_stage,
          COUNT(*) as transition_count,
          ROUND(AVG(h.duration_days)::NUMERIC, 1) as avg_days
        FROM deal_stage_history h
        WHERE h.from_stage IS NOT NULL AND h.to_stage IS NOT NULL
        GROUP BY h.from_stage, h.to_stage
        ORDER BY MIN(ds_from.stage_order), MIN(ds_to.stage_order)
      ) cr
      LEFT JOIN deal_stages ds_from ON LOWER(ds_from.name) = LOWER(cr.from_stage)
      LEFT JOIN deal_stages ds_to ON LOWER(ds_to.name) = LOWER(cr.to_stage)
    ),
    'win_rate', (
      SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE deal_stage IN ('Closed Won', 'Closed Lost')) > 0 
        THEN ROUND(
          (COUNT(*) FILTER (WHERE deal_stage = 'Closed Won')::NUMERIC / 
           COUNT(*) FILTER (WHERE deal_stage IN ('Closed Won', 'Closed Lost'))::NUMERIC) * 100, 1
        )
        ELSE 0
      END
      FROM jobs
      WHERE deal_stage IN ('Closed Won', 'Closed Lost')
    ),
    'avg_days_to_close', (
      SELECT COALESCE(ROUND(AVG(
        EXTRACT(DAY FROM (COALESCE(j.closed_at::TIMESTAMP, j.updated_at) - j.created_at))
      )::NUMERIC, 0), 0)
      FROM jobs j
      WHERE j.deal_stage = 'Closed Won'
    ),
    'total_history_records', (
      SELECT COUNT(*) FROM deal_stage_history
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
