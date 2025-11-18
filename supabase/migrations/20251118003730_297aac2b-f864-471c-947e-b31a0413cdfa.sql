-- Create backup verification logs table
CREATE TABLE IF NOT EXISTS public.backup_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  backup_id TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('success', 'failed', 'partial')),
  tables_verified INTEGER NOT NULL,
  total_tables INTEGER NOT NULL,
  verification_duration_ms INTEGER NOT NULL,
  issues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_verification_timestamp ON public.backup_verification_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_backup_verification_status ON public.backup_verification_logs(verification_status);

-- Create platform alerts table
CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_alerts_severity ON public.platform_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_acknowledged ON public.platform_alerts(acknowledged, created_at DESC);

-- Enable RLS
ALTER TABLE public.backup_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view DR data
CREATE POLICY "Admins can view backup logs"
  ON public.backup_verification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view platform alerts"
  ON public.platform_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can acknowledge alerts"
  ON public.platform_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert backup logs"
  ON public.backup_verification_logs
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can insert alerts"
  ON public.platform_alerts
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');