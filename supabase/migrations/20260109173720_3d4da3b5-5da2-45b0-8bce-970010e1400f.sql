-- Seed default KPI alert configurations
INSERT INTO public.kpi_alert_configs (kpi_name, domain, warning_threshold, critical_threshold, is_lower_better, alert_on_warning, alert_on_critical, is_active, notification_channels, cooldown_minutes)
VALUES 
  ('win_rate', 'sales', 40, 25, false, true, true, true, ARRAY['in_app'], 60),
  ('show_rate', 'sales', 70, 50, false, true, true, true, ARRAY['in_app'], 60),
  ('pipeline_coverage_ratio', 'sales', 200, 100, false, true, true, true, ARRAY['in_app'], 60),
  ('avg_deal_cycle_days', 'sales', 45, 60, true, true, true, true, ARRAY['in_app'], 60),
  ('bounce_rate', 'website', 50, 65, true, true, true, true, ARRAY['in_app'], 60),
  ('cpl', 'website', 175, 250, true, true, true, true, ARRAY['in_app'], 60),
  ('conversion_rate', 'website', 2, 1, false, true, true, true, ARRAY['in_app'], 60),
  ('task_completion_rate', 'operations', 70, 50, false, true, true, true, ARRAY['in_app'], 60),
  ('avg_response_time_hours', 'operations', 12, 24, true, true, true, true, ARRAY['in_app'], 60)
ON CONFLICT (kpi_name, domain) DO UPDATE SET
  warning_threshold = EXCLUDED.warning_threshold,
  critical_threshold = EXCLUDED.critical_threshold,
  is_lower_better = EXCLUDED.is_lower_better,
  is_active = EXCLUDED.is_active,
  notification_channels = EXCLUDED.notification_channels,
  cooldown_minutes = EXCLUDED.cooldown_minutes;

-- Add unique constraint if not exists (for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kpi_alert_configs_kpi_name_domain_key'
  ) THEN
    ALTER TABLE public.kpi_alert_configs ADD CONSTRAINT kpi_alert_configs_kpi_name_domain_key UNIQUE (kpi_name, domain);
  END IF;
END $$;