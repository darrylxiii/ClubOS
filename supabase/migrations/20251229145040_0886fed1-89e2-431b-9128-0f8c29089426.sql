-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ms',
  page_path TEXT,
  user_agent TEXT,
  connection_type TEXT,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SLA Violations Table
CREATE TABLE IF NOT EXISTS public.sla_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  page_path TEXT,
  user_agent TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_performance_metrics_type_recorded ON public.performance_metrics(metric_type, recorded_at DESC);
CREATE INDEX idx_performance_metrics_recorded_at ON public.performance_metrics(recorded_at DESC);
CREATE INDEX idx_sla_violations_severity_detected ON public.sla_violations(severity, detected_at DESC);
CREATE INDEX idx_sla_violations_detected_at ON public.sla_violations(detected_at DESC);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_violations ENABLE ROW LEVEL SECURITY;

-- Allow insert from any authenticated or anonymous user (for client-side metrics)
CREATE POLICY "Allow insert performance metrics" 
  ON public.performance_metrics 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow insert SLA violations" 
  ON public.sla_violations 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read metrics
CREATE POLICY "Admins can read performance metrics" 
  ON public.performance_metrics 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can read SLA violations" 
  ON public.sla_violations 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update violations (acknowledge)
CREATE POLICY "Admins can update SLA violations" 
  ON public.sla_violations 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.performance_metrics IS 'Stores client-side performance metrics for monitoring and SLA compliance';
COMMENT ON TABLE public.sla_violations IS 'Tracks SLA threshold violations for alerting and analysis';