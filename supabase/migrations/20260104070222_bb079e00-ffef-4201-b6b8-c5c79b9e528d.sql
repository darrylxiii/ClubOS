-- Security Incidents table for SOC 2 compliance
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  incident_type TEXT NOT NULL,
  affected_systems TEXT[] DEFAULT '{}',
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage security incidents
CREATE POLICY "Admins can manage security incidents"
ON public.security_incidents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON public.security_incidents(created_at DESC);