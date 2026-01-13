-- Create analytics_export_log table for GDPR compliance tracking
CREATE TABLE IF NOT EXISTS public.analytics_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL,
  data_scope TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_analytics_export_log_user_id ON public.analytics_export_log(user_id);

-- Enable RLS for export log
ALTER TABLE public.analytics_export_log ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own export logs
CREATE POLICY "Users can view their own export logs"
  ON public.analytics_export_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export logs"
  ON public.analytics_export_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);