-- Create the comprehensive_audit_logs table for security logging
CREATE TABLE IF NOT EXISTS public.comprehensive_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  actor_ip_address INET,
  actor_user_agent TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT DEFAULT 'security',
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  before_value JSONB,
  after_value JSONB,
  changed_fields TEXT[],
  description TEXT,
  metadata JSONB,
  compliance_tags TEXT[] DEFAULT ARRAY['soc2'],
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  event_timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.comprehensive_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view audit logs using has_role function
CREATE POLICY "Admins can view audit logs" ON public.comprehensive_audit_logs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Create policy to allow inserts (for edge functions with service role)
CREATE POLICY "Allow insert audit logs" ON public.comprehensive_audit_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_logs_actor ON public.comprehensive_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_logs_event_type ON public.comprehensive_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_logs_timestamp ON public.comprehensive_audit_logs(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comprehensive_audit_logs_category ON public.comprehensive_audit_logs(event_category);

-- Add available_spots to funnel_config live_stats if not present
UPDATE public.funnel_config 
SET live_stats = live_stats || '{"available_spots": 2}'::jsonb
WHERE NOT (live_stats ? 'available_spots');