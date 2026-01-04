-- Update kpi_metrics with realistic values and previous values for trends
UPDATE public.kpi_metrics SET
  previous_value = COALESCE(value, 0),
  value = CASE kpi_name
    WHEN 'hours_worked' THEN 152
    WHEN 'tasks_completed' THEN 47
    WHEN 'productivity_index' THEN 78
    WHEN 'active_candidates' THEN 89
    WHEN 'roles_open' THEN 18
    WHEN 'avg_time_to_fill' THEN 28
    WHEN 'applications_week' THEN 42
    WHEN 'interview_rate' THEN 28
    WHEN 'offer_rate' THEN 18
    WHEN 'nps_candidate' THEN 45
    WHEN 'nps_client' THEN 52
    WHEN 'billable_utilization' THEN 72
    WHEN 'revenue_per_placement' THEN 14200
    WHEN 'gross_margin' THEN 32
    ELSE COALESCE(value, 0)
  END,
  updated_at = now(),
  period_start = date_trunc('month', now())::date,
  period_end = (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;

-- Run trend calculation
SELECT calculate_kpi_trends();