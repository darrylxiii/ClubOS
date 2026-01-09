-- =====================================================
-- Part 1: Create kpi_calculation_log table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kpi_calculation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_type text NOT NULL,
  domains_calculated text[],
  results jsonb,
  success_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  total_metrics integer DEFAULT 0,
  duration_ms integer,
  triggered_by text DEFAULT 'system',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kpi_calculation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view kpi calculation logs"
  ON public.kpi_calculation_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_kpi_calculation_log_created 
  ON public.kpi_calculation_log (created_at DESC);