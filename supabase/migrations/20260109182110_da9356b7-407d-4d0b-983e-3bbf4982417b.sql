-- ============================================
-- PHASE 1: KPI HISTORY TRIGGERS
-- Automatically record every KPI value change
-- ============================================

-- Create an improved history recording function with better error handling
CREATE OR REPLACE FUNCTION public.record_kpi_to_history_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_kpi_name TEXT;
  v_category TEXT;
  v_value NUMERIC;
  v_target_value NUMERIC;
  v_trend NUMERIC;
  v_status TEXT;
BEGIN
  -- Determine domain from trigger argument or table name
  IF TG_NARGS > 0 THEN
    v_domain := TG_ARGV[0];
  ELSE
    v_domain := CASE 
      WHEN TG_TABLE_NAME = 'kpi_metrics' THEN 'operations'
      WHEN TG_TABLE_NAME = 'sales_kpi_metrics' THEN 'sales'
      WHEN TG_TABLE_NAME = 'web_kpi_metrics' THEN 'website'
      ELSE 'unknown'
    END;
  END IF;

  -- Extract values based on table structure
  v_kpi_name := COALESCE(NEW.metric_name, NEW.kpi_name, 'unknown');
  v_category := COALESCE(NEW.category, v_domain);
  v_value := COALESCE(NEW.value, NEW.current_value, 0);
  v_target_value := COALESCE(NEW.target_value, NEW.target, NULL);
  v_trend := COALESCE(NEW.trend, NEW.trend_percentage, NULL);
  v_status := COALESCE(NEW.status, 'unknown');

  -- Insert into history table
  INSERT INTO public.kpi_history (
    kpi_name,
    category,
    domain,
    value,
    target_value,
    trend,
    status,
    recorded_at
  ) VALUES (
    v_kpi_name,
    v_category,
    v_domain,
    v_value,
    v_target_value,
    v_trend,
    v_status,
    COALESCE(NEW.updated_at, NEW.calculated_at, NOW())
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE WARNING 'KPI History recording failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS kpi_metrics_to_history ON public.kpi_metrics;
DROP TRIGGER IF EXISTS sales_kpi_metrics_to_history ON public.sales_kpi_metrics;
DROP TRIGGER IF EXISTS web_kpi_metrics_to_history ON public.web_kpi_metrics;

-- Create triggers for each KPI table
CREATE TRIGGER kpi_metrics_to_history
  AFTER INSERT OR UPDATE ON public.kpi_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.record_kpi_to_history_v2('operations');

CREATE TRIGGER sales_kpi_metrics_to_history
  AFTER INSERT OR UPDATE ON public.sales_kpi_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.record_kpi_to_history_v2('sales');

CREATE TRIGGER web_kpi_metrics_to_history
  AFTER INSERT OR UPDATE ON public.web_kpi_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.record_kpi_to_history_v2('website');

-- Add index for efficient history queries
CREATE INDEX IF NOT EXISTS idx_kpi_history_lookup 
ON public.kpi_history (kpi_name, domain, recorded_at DESC);

-- Add comment for documentation
COMMENT ON FUNCTION public.record_kpi_to_history_v2() IS 
'Automatically records KPI metric changes to the kpi_history table for trend analysis and auditing. Part of Phase 1 infrastructure improvements.';