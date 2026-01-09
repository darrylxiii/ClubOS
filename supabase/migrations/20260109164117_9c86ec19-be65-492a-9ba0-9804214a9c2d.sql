-- Part 2: Add columns to kpi_alert_configs and create history triggers

-- Add missing columns
ALTER TABLE public.kpi_alert_configs
ADD COLUMN IF NOT EXISTS warning_threshold numeric,
ADD COLUMN IF NOT EXISTS critical_threshold numeric,
ADD COLUMN IF NOT EXISTS is_lower_better boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_channels text[] DEFAULT ARRAY['in_app'],
ADD COLUMN IF NOT EXISTS cooldown_minutes integer DEFAULT 60;

-- Create history recording function
CREATE OR REPLACE FUNCTION public.record_kpi_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO public.kpi_history (kpi_name, domain, category, value, target_value, status, trend, recorded_at, metadata)
    VALUES (
      NEW.kpi_name,
      CASE TG_TABLE_NAME WHEN 'sales_kpi_metrics' THEN 'sales' WHEN 'web_kpi_metrics' THEN 'website' ELSE 'operations' END,
      NEW.category, NEW.value, NEW.target_value, NEW.status,
      CASE TG_TABLE_NAME WHEN 'kpi_metrics' THEN NEW.trend_direction ELSE NEW.trend END,
      NOW(), jsonb_build_object('source', TG_TABLE_NAME, 'id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS kpi_metrics_to_history ON public.kpi_metrics;
CREATE TRIGGER kpi_metrics_to_history AFTER INSERT OR UPDATE ON public.kpi_metrics FOR EACH ROW EXECUTE FUNCTION public.record_kpi_to_history();

DROP TRIGGER IF EXISTS sales_kpi_metrics_to_history ON public.sales_kpi_metrics;
CREATE TRIGGER sales_kpi_metrics_to_history AFTER INSERT OR UPDATE ON public.sales_kpi_metrics FOR EACH ROW EXECUTE FUNCTION public.record_kpi_to_history();

DROP TRIGGER IF EXISTS web_kpi_metrics_to_history ON public.web_kpi_metrics;
CREATE TRIGGER web_kpi_metrics_to_history AFTER INSERT OR UPDATE ON public.web_kpi_metrics FOR EACH ROW EXECUTE FUNCTION public.record_kpi_to_history();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_kpi_history_lookup ON public.kpi_history (kpi_name, recorded_at DESC);