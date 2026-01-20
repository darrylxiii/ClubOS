-- Create PITR test markers table (temporary test data)
CREATE TABLE IF NOT EXISTS public.pitr_test_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL,
  marker_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create PITR test logs table
CREATE TABLE IF NOT EXISTS public.pitr_test_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL,
  target_recovery_time TIMESTAMPTZ NOT NULL,
  test_status TEXT NOT NULL CHECK (test_status IN ('success', 'failed')),
  recovery_accuracy DECIMAL(5,2),
  duration_seconds DECIMAL(10,2),
  data_loss_detected BOOLEAN DEFAULT false,
  notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pitr_test_logs_timestamp ON public.pitr_test_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pitr_test_logs_status ON public.pitr_test_logs(test_status);

-- Enable RLS
ALTER TABLE public.pitr_test_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitr_test_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view PITR data
CREATE POLICY "Admins can view PITR test markers"
  ON public.pitr_test_markers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view PITR test logs"
  ON public.pitr_test_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert PITR markers"
  ON public.pitr_test_markers
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can insert PITR logs"
  ON public.pitr_test_logs
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Service role can delete old PITR markers (cleanup)
CREATE POLICY "Service role can delete PITR markers"
  ON public.pitr_test_markers
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');