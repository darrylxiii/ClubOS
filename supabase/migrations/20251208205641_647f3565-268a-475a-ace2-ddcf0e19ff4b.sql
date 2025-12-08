-- Fix Security Definer Views by adding security_invoker=true
-- This ensures views respect RLS policies of the querying user

-- Drop and recreate team_time_tracking_summary with security_invoker=true
DROP VIEW IF EXISTS team_time_tracking_summary;

CREATE VIEW team_time_tracking_summary 
WITH (security_invoker=true)
AS
SELECT 
    te.company_id,
    te.user_id,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar,
    date(te.start_time) AS work_date,
    sum(te.duration_seconds) AS total_seconds,
    sum(te.duration_seconds) FILTER (WHERE te.is_billable = true) AS billable_seconds,
    sum(te.earnings) AS total_earnings,
    count(*) AS entry_count,
    avg(
        CASE
            WHEN te.activity_level ~ '^\d+$'::text THEN te.activity_level::integer
            ELSE NULL::integer
        END) AS avg_activity_level
FROM time_entries te
JOIN profiles p ON p.id = te.user_id
WHERE te.company_id IS NOT NULL AND te.end_time IS NOT NULL
GROUP BY te.company_id, te.user_id, p.full_name, p.avatar_url, (date(te.start_time));

-- Drop and recreate time_tracking_revenue_metrics with security_invoker=true
DROP VIEW IF EXISTS time_tracking_revenue_metrics;

CREATE VIEW time_tracking_revenue_metrics 
WITH (security_invoker=true)
AS
SELECT 
    user_id,
    company_id,
    contract_id,
    date_trunc('week'::text, start_time) AS week_start,
    date_trunc('month'::text, start_time) AS month_start,
    sum(duration_seconds) AS total_seconds,
    sum(duration_seconds) FILTER (WHERE is_billable = true) AS billable_seconds,
    sum(earnings) AS total_earnings,
    count(*) AS entry_count,
    avg(
        CASE
            WHEN activity_level ~ '^\d+$'::text THEN activity_level::integer
            ELSE NULL::integer
        END) AS avg_activity_level
FROM time_entries te
WHERE end_time IS NOT NULL
GROUP BY user_id, company_id, contract_id, (date_trunc('week'::text, start_time)), (date_trunc('month'::text, start_time));

-- Grant appropriate permissions
GRANT SELECT ON team_time_tracking_summary TO authenticated;
GRANT SELECT ON time_tracking_revenue_metrics TO authenticated;