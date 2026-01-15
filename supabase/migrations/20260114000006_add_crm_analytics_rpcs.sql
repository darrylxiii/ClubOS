-- RPC: Get Overview Stats
CREATE OR REPLACE FUNCTION get_crm_overview_stats(range_start timestamptz, range_end timestamptz, campaign_id_filter uuid DEFAULT NULL, owner_id_filter uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'totalProspects', COALESCE(COUNT(*), 0),
    'activeProspects', COALESCE(COUNT(*) FILTER (WHERE stage NOT IN ('closed_lost', 'closed_won', 'unsubscribed')), 0),
    'hotLeads', COALESCE(COUNT(*) FILTER (WHERE reply_sentiment = 'hot'), 0),
    'meetingsBooked', COALESCE(COUNT(*) FILTER (WHERE stage = 'meeting_booked'), 0),
    'dealsWon', COALESCE(COUNT(*) FILTER (WHERE stage = 'closed_won'), 0),
    'totalRevenue', COALESCE(SUM(deal_value) FILTER (WHERE stage = 'closed_won'), 0),
    'avgDealSize', COALESCE(AVG(deal_value) FILTER (WHERE deal_value > 0), 0),
    'conversionRate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE stage = 'closed_won')::numeric / COUNT(*)::numeric) * 100 ELSE 0 END
  ) INTO result
  FROM crm_prospects
  WHERE created_at >= range_start AND created_at <= range_end
  AND (campaign_id_filter IS NULL OR campaign_id = campaign_id_filter)
  AND (owner_id_filter IS NULL OR owner_id = owner_id_filter);

  RETURN result;
END;
$$;

-- RPC: Get Funnel Stats
CREATE OR REPLACE FUNCTION get_crm_funnel_stats(range_start timestamptz, range_end timestamptz, campaign_id_filter uuid DEFAULT NULL, owner_id_filter uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stages text[] := ARRAY['new', 'contacted', 'opened', 'replied', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost'];
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'stage', s.stage,
      'count', COALESCE(c.count, 0),
      'value', COALESCE(c.value, 0)
    )
  ) INTO result
  FROM unnest(stages) AS s(stage)
  LEFT JOIN (
    SELECT stage, COUNT(*) as count, SUM(COALESCE(deal_value, 0)) as value
    FROM crm_prospects
    WHERE created_at >= range_start AND created_at <= range_end
    AND (campaign_id_filter IS NULL OR campaign_id = campaign_id_filter)
    AND (owner_id_filter IS NULL OR owner_id = owner_id_filter)
    GROUP BY stage
  ) c ON c.stage = s.stage;

  RETURN result;
END;
$$;

-- RPC: Get Daily Trends
CREATE OR REPLACE FUNCTION get_crm_daily_trends(range_start timestamptz, range_end timestamptz)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Note: generated series uses timezone of the session preferably or utc.
  -- We'll assume UTC for standardization.
  SELECT json_agg(
    json_build_object(
      'date', to_char(day_series.day, 'YYYY-MM-DD'),
      'prospects', COALESCE(p.count, 0),
      'replies', COALESCE(r.count, 0),
      'meetings', COALESCE(m.count, 0),
      'deals', COALESCE(d.count, 0)
    )
  ) INTO result
  FROM generate_series(range_start, range_end, '1 day'::interval) AS day_series(day)
  LEFT JOIN (
    SELECT date_trunc('day', created_at) as day, COUNT(*) as count
    FROM crm_prospects
    WHERE created_at >= range_start AND created_at <= range_end
    GROUP BY 1
  ) p ON p.day = date_trunc('day', day_series.day)
  LEFT JOIN (
    SELECT date_trunc('day', received_at) as day, COUNT(*) as count
    FROM crm_email_replies
    WHERE received_at >= range_start AND received_at <= range_end
    GROUP BY 1
  ) r ON r.day = date_trunc('day', day_series.day)
  LEFT JOIN (
    SELECT date_trunc('day', created_at) as day, COUNT(*) as count
    FROM crm_prospects
    WHERE created_at >= range_start AND created_at <= range_end AND stage = 'meeting_booked'
    GROUP BY 1
  ) m ON m.day = date_trunc('day', day_series.day)
  LEFT JOIN (
    SELECT date_trunc('day', created_at) as day, COUNT(*) as count
    FROM crm_prospects
    WHERE created_at >= range_start AND created_at <= range_end AND stage = 'closed_won'
    GROUP BY 1
  ) d ON d.day = date_trunc('day', day_series.day);

  RETURN result;
END;
$$;

-- RPC: Get Owner Stats
CREATE OR REPLACE FUNCTION get_crm_owner_stats(range_start timestamptz, range_end timestamptz)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'ownerId', stats.owner_id,
      'prospects', stats.prospects,
      'meetings', stats.meetings,
      'deals', stats.deals,
      'revenue', stats.revenue
    )
  ) INTO result
  FROM (
    SELECT 
      owner_id,
      COUNT(*) as prospects,
      COUNT(*) FILTER (WHERE stage = 'meeting_booked') as meetings,
      COUNT(*) FILTER (WHERE stage = 'closed_won') as deals,
      SUM(COALESCE(deal_value, 0)) FILTER (WHERE stage = 'closed_won') as revenue
    FROM crm_prospects
    WHERE created_at >= range_start AND created_at <= range_end
    AND owner_id IS NOT NULL
    GROUP BY owner_id
  ) stats;

  RETURN result;
END;
$$;

-- RPC: Get Reply Stats
CREATE OR REPLACE FUNCTION get_crm_reply_stats(range_start timestamptz, range_end timestamptz)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_count int;
BEGIN
  SELECT COUNT(*) INTO total_count FROM crm_email_replies WHERE received_at >= range_start AND received_at <= range_end;

  SELECT json_agg(
    json_build_object(
      'classification', classification,
      'count', count,
      'percentage', CASE WHEN total_count > 0 THEN (count::numeric / total_count::numeric) * 100 ELSE 0 END
    )
  ) INTO result
  FROM (
    SELECT classification, COUNT(*) as count
    FROM crm_email_replies
    WHERE received_at >= range_start AND received_at <= range_end
    GROUP BY classification
  ) grouped;

  RETURN result;
END;
$$;
