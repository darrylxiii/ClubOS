-- Create company_activity_events table if not exists
CREATE TABLE IF NOT EXISTS public.company_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for company activity events
CREATE INDEX IF NOT EXISTS idx_company_activity_events_company ON public.company_activity_events(company_id);
CREATE INDEX IF NOT EXISTS idx_company_activity_events_created ON public.company_activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_activity_events_type ON public.company_activity_events(event_type);

-- Enable RLS
ALTER TABLE public.company_activity_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_activity_events
DROP POLICY IF EXISTS "Company members can view activity" ON public.company_activity_events;
CREATE POLICY "Company members can view activity"
  ON public.company_activity_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_activity_events.company_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert activity events" ON public.company_activity_events;
CREATE POLICY "System can insert activity events"
  ON public.company_activity_events FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_activity_events;