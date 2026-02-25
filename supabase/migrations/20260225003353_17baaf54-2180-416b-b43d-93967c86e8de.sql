-- Email tracking events for open/click analytics from Resend webhooks
CREATE TABLE IF NOT EXISTS public.email_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resend_email_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient_email TEXT,
  subject TEXT,
  clicked_url TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_email_tracking_resend_id ON public.email_tracking_events (resend_email_id);
CREATE INDEX idx_email_tracking_event_type ON public.email_tracking_events (event_type);
CREATE INDEX idx_email_tracking_created_at ON public.email_tracking_events (created_at DESC);

-- RLS: Only admins can read tracking data (via service role); no public access
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Admins can view email tracking events"
  ON public.email_tracking_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
