-- ============================================
-- CRM Report Aggregation RPC Functions
-- ============================================
-- Server-side aggregation to replace client-side calculations
-- Improves performance for large datasets

-- 1. Main CRM Report Aggregation Function
CREATE OR REPLACE FUNCTION public.get_crm_report_aggregation(
  p_data_source text,
  p_group_by text,
  p_metric text,
  p_start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  p_end_date timestamptz DEFAULT NOW(),
  p_owner_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS TABLE (
  group_key text,
  group_label text,
  metric_value numeric,
  record_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_data_source = 'deals' OR p_data_source = 'prospects' THEN
    RETURN QUERY
    SELECT
      CASE p_group_by
        WHEN 'stage' THEN COALESCE(stage, 'unknown')
        WHEN 'owner' THEN COALESCE(owner_id::text, 'unassigned')
        WHEN 'source' THEN COALESCE(source, 'direct')
        WHEN 'campaign' THEN COALESCE(campaign_id::text, 'no_campaign')
        WHEN 'month' THEN TO_CHAR(created_at, 'YYYY-MM')
        WHEN 'week' THEN TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')
        ELSE 'all'
      END as group_key,
      CASE p_group_by
        WHEN 'stage' THEN INITCAP(REPLACE(COALESCE(stage, 'unknown'), '_', ' '))
        WHEN 'owner' THEN COALESCE(
          (SELECT full_name FROM profiles WHERE id = owner_id LIMIT 1),
          'Unassigned'
        )
        WHEN 'source' THEN INITCAP(COALESCE(source, 'Direct'))
        WHEN 'month' THEN TO_CHAR(created_at, 'Mon YYYY')
        WHEN 'week' THEN 'Week of ' || TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD')
        ELSE 'All'
      END as group_label,
      CASE p_metric
        WHEN 'count' THEN COUNT(*)::numeric
        WHEN 'sum_value' THEN COALESCE(SUM((metadata->>'deal_value')::numeric), 0)
        WHEN 'avg_value' THEN COALESCE(AVG((metadata->>'deal_value')::numeric), 0)
        WHEN 'avg_score' THEN COALESCE(AVG(score), 0)
        WHEN 'conversion_rate' THEN
          CASE WHEN COUNT(*) > 0
          THEN (COUNT(*) FILTER (WHERE status = 'won')::numeric / COUNT(*) * 100)
          ELSE 0 END
        ELSE COUNT(*)::numeric
      END as metric_value,
      COUNT(*) as record_count
    FROM crm_prospects
    WHERE created_at BETWEEN p_start_date AND p_end_date
      AND (p_owner_id IS NULL OR owner_id = p_owner_id)
      AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
    GROUP BY 1, 2
    ORDER BY metric_value DESC;

  ELSIF p_data_source = 'activities' THEN
    RETURN QUERY
    SELECT
      CASE p_group_by
        WHEN 'type' THEN activity_type
        WHEN 'owner' THEN COALESCE(user_id::text, 'system')
        WHEN 'month' THEN TO_CHAR(created_at, 'YYYY-MM')
        WHEN 'week' THEN TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')
        ELSE 'all'
      END as group_key,
      CASE p_group_by
        WHEN 'type' THEN INITCAP(REPLACE(activity_type, '_', ' '))
        WHEN 'owner' THEN COALESCE(
          (SELECT full_name FROM profiles WHERE id = user_id LIMIT 1),
          'System'
        )
        WHEN 'month' THEN TO_CHAR(created_at, 'Mon YYYY')
        ELSE 'All'
      END as group_label,
      COUNT(*)::numeric as metric_value,
      COUNT(*) as record_count
    FROM crm_activities
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY 1, 2
    ORDER BY metric_value DESC;
  END IF;
END;
$$;

-- 2. Get CRM Funnel Data
CREATE OR REPLACE FUNCTION public.get_crm_funnel_data(
  p_start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  p_end_date timestamptz DEFAULT NOW(),
  p_owner_id uuid DEFAULT NULL
)
RETURNS TABLE (
  stage text,
  stage_order integer,
  prospect_count bigint,
  total_value numeric,
  conversion_rate numeric,
  avg_days_in_stage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stage_order AS (
    SELECT unnest(ARRAY['lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']) as stage_name,
           generate_series(1, 7) as sort_order
  ),
  stage_stats AS (
    SELECT
      p.stage,
      COUNT(*) as cnt,
      COALESCE(SUM((p.metadata->>'deal_value')::numeric), 0) as value,
      AVG(EXTRACT(EPOCH FROM (
        COALESCE(p.updated_at, NOW()) - p.created_at
      )) / 86400) as avg_days
    FROM crm_prospects p
    WHERE p.created_at BETWEEN p_start_date AND p_end_date
      AND (p_owner_id IS NULL OR p.owner_id = p_owner_id)
    GROUP BY p.stage
  )
  SELECT
    so.stage_name as stage,
    so.sort_order as stage_order,
    COALESCE(ss.cnt, 0) as prospect_count,
    COALESCE(ss.value, 0) as total_value,
    CASE
      WHEN LAG(ss.cnt) OVER (ORDER BY so.sort_order) > 0
      THEN ROUND((ss.cnt::numeric / LAG(ss.cnt) OVER (ORDER BY so.sort_order) * 100), 2)
      ELSE 100
    END as conversion_rate,
    COALESCE(ROUND(ss.avg_days, 1), 0) as avg_days_in_stage
  FROM stage_order so
  LEFT JOIN stage_stats ss ON so.stage_name = ss.stage
  ORDER BY so.sort_order;
END;
$$;

-- 3. Get CRM Owner Performance
CREATE OR REPLACE FUNCTION public.get_crm_owner_performance(
  p_start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  p_end_date timestamptz DEFAULT NOW()
)
RETURNS TABLE (
  owner_id uuid,
  owner_name text,
  total_prospects bigint,
  active_prospects bigint,
  deals_won bigint,
  deals_lost bigint,
  total_revenue numeric,
  win_rate numeric,
  avg_deal_size numeric,
  activities_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.owner_id,
    COALESCE(pr.full_name, 'Unassigned') as owner_name,
    COUNT(*) as total_prospects,
    COUNT(*) FILTER (WHERE p.status NOT IN ('won', 'lost')) as active_prospects,
    COUNT(*) FILTER (WHERE p.status = 'won') as deals_won,
    COUNT(*) FILTER (WHERE p.status = 'lost') as deals_lost,
    COALESCE(SUM((p.metadata->>'deal_value')::numeric) FILTER (WHERE p.status = 'won'), 0) as total_revenue,
    CASE
      WHEN COUNT(*) FILTER (WHERE p.status IN ('won', 'lost')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE p.status = 'won')::numeric /
        COUNT(*) FILTER (WHERE p.status IN ('won', 'lost')) * 100, 2
      )
      ELSE 0
    END as win_rate,
    CASE
      WHEN COUNT(*) FILTER (WHERE p.status = 'won') > 0
      THEN ROUND(
        SUM((p.metadata->>'deal_value')::numeric) FILTER (WHERE p.status = 'won') /
        COUNT(*) FILTER (WHERE p.status = 'won'), 2
      )
      ELSE 0
    END as avg_deal_size,
    (
      SELECT COUNT(*)
      FROM crm_activities a
      WHERE a.user_id = p.owner_id
        AND a.created_at BETWEEN p_start_date AND p_end_date
    ) as activities_count
  FROM crm_prospects p
  LEFT JOIN profiles pr ON p.owner_id = pr.id
  WHERE p.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY p.owner_id, pr.full_name
  ORDER BY total_revenue DESC;
END;
$$;

-- 4. Get CRM Time Series Data (for charts)
CREATE OR REPLACE FUNCTION public.get_crm_time_series(
  p_metric text,
  p_interval text DEFAULT 'day',
  p_start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  p_end_date timestamptz DEFAULT NOW()
)
RETURNS TABLE (
  period_start timestamptz,
  period_label text,
  metric_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC(p_interval, created_at) as period_start,
    CASE p_interval
      WHEN 'day' THEN TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD')
      WHEN 'week' THEN 'Week ' || TO_CHAR(DATE_TRUNC('week', created_at), 'WW')
      WHEN 'month' THEN TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY')
      ELSE TO_CHAR(DATE_TRUNC(p_interval, created_at), 'YYYY-MM-DD')
    END as period_label,
    CASE p_metric
      WHEN 'prospects' THEN COUNT(*)::numeric
      WHEN 'revenue' THEN COALESCE(SUM((metadata->>'deal_value')::numeric) FILTER (WHERE status = 'won'), 0)
      WHEN 'deals_won' THEN COUNT(*) FILTER (WHERE status = 'won')::numeric
      WHEN 'deals_lost' THEN COUNT(*) FILTER (WHERE status = 'lost')::numeric
      ELSE COUNT(*)::numeric
    END as metric_value
  FROM crm_prospects
  WHERE created_at BETWEEN p_start_date AND p_end_date
  GROUP BY DATE_TRUNC(p_interval, created_at)
  ORDER BY period_start;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_crm_report_aggregation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_funnel_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_owner_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_time_series TO authenticated;

-- Documentation
COMMENT ON FUNCTION public.get_crm_report_aggregation IS
'Server-side aggregation for CRM reports. Replaces client-side calculations for better performance with large datasets.';

COMMENT ON FUNCTION public.get_crm_funnel_data IS
'Returns CRM funnel/pipeline data with conversion rates and stage timing.';

COMMENT ON FUNCTION public.get_crm_owner_performance IS
'Returns performance metrics for each CRM owner/rep including win rates and revenue.';

COMMENT ON FUNCTION public.get_crm_time_series IS
'Returns time-series data for CRM metrics, optimized for chart rendering.';
