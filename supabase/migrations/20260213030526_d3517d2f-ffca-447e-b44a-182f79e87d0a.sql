
-- =============================================================================
-- Agentic OS: Database Migration
-- =============================================================================

-- 1. Agentic Heartbeat Log table for observability
CREATE TABLE public.agentic_heartbeat_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  agents_invoked TEXT[] NOT NULL DEFAULT '{}',
  results JSONB DEFAULT '{}',
  duration_ms INTEGER,
  errors JSONB DEFAULT '[]',
  events_processed INTEGER DEFAULT 0,
  signals_detected INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only admins can read heartbeat logs
ALTER TABLE public.agentic_heartbeat_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view heartbeat logs"
  ON public.agentic_heartbeat_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- 2. Add acknowledged columns to predictive_signals
ALTER TABLE public.predictive_signals
  ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- 3. Daily briefings table
CREATE TABLE public.daily_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content JSONB NOT NULL DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, briefing_date)
);

ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings"
  ON public.daily_briefings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own briefings"
  ON public.daily_briefings FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Trigger on jobs table: when status changes to 'open', publish agent event
CREATE OR REPLACE FUNCTION public.trigger_job_open_agent_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD.status IS NULL OR OLD.status != 'open') THEN
    INSERT INTO public.agent_events (
      event_type, event_source, entity_type, entity_id, 
      event_data, priority, processed
    ) VALUES (
      'job_status_open', 'database_trigger', 'job', NEW.id,
      jsonb_build_object(
        'job_id', NEW.id,
        'title', NEW.title,
        'company_id', NEW.company_id,
        'previous_status', OLD.status
      ),
      8, false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_job_status_open
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_job_open_agent_event();
