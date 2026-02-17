
-- Part 1: Add primary_job_id to sessions
ALTER TABLE public.linkedin_avatar_sessions
  ADD COLUMN IF NOT EXISTS primary_job_id uuid REFERENCES public.jobs(id);

-- Add anomaly_flags to sessions
ALTER TABLE public.linkedin_avatar_sessions
  ADD COLUMN IF NOT EXISTS anomaly_flags text[] DEFAULT '{}';

-- Part 2: Session-job tracking table
CREATE TABLE public.linkedin_avatar_session_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.linkedin_avatar_sessions(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  minutes_logged integer,
  is_primary boolean DEFAULT true,
  productivity_rating smallint CHECK (productivity_rating IS NULL OR (productivity_rating >= 1 AND productivity_rating <= 5)),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Part 3: Time corrections audit table
CREATE TABLE public.linkedin_avatar_time_corrections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_job_id uuid NOT NULL REFERENCES public.linkedin_avatar_session_jobs(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.linkedin_avatar_sessions(id) ON DELETE CASCADE,
  corrected_by uuid NOT NULL,
  original_minutes integer NOT NULL,
  corrected_minutes integer NOT NULL,
  reason text NOT NULL,
  correction_type text NOT NULL CHECK (correction_type IN ('too_long', 'too_short', 'wrong_job', 'split')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Part 4: Add hourly_cost_rate to accounts for cost-per-job
ALTER TABLE public.linkedin_avatar_accounts
  ADD COLUMN IF NOT EXISTS hourly_cost_rate numeric;

-- Part 5: Enable RLS
ALTER TABLE public.linkedin_avatar_session_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_avatar_time_corrections ENABLE ROW LEVEL SECURITY;

-- RLS: session_jobs - authenticated can read all
CREATE POLICY "Authenticated users can read session_jobs"
  ON public.linkedin_avatar_session_jobs FOR SELECT
  TO authenticated USING (true);

-- RLS: session_jobs - insert if user owns the session
CREATE POLICY "Users can insert session_jobs for own sessions"
  ON public.linkedin_avatar_session_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.linkedin_avatar_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- RLS: session_jobs - update if user owns the session
CREATE POLICY "Users can update session_jobs for own sessions"
  ON public.linkedin_avatar_session_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.linkedin_avatar_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- RLS: time_corrections - authenticated can read all
CREATE POLICY "Authenticated users can read time_corrections"
  ON public.linkedin_avatar_time_corrections FOR SELECT
  TO authenticated USING (true);

-- RLS: time_corrections - insert own
CREATE POLICY "Users can insert own time_corrections"
  ON public.linkedin_avatar_time_corrections FOR INSERT
  TO authenticated
  WITH CHECK (corrected_by = auth.uid());

-- Part 6: Anomaly detection function
CREATE OR REPLACE FUNCTION public.flag_session_anomalies()
RETURNS trigger AS $$
DECLARE
  actual_minutes integer;
  expected_minutes integer;
  flags text[] := '{}';
BEGIN
  IF NEW.status = 'completed' AND NEW.ended_at IS NOT NULL AND OLD.status = 'active' THEN
    actual_minutes := EXTRACT(EPOCH FROM (NEW.ended_at::timestamptz - NEW.started_at::timestamptz)) / 60;
    expected_minutes := EXTRACT(EPOCH FROM (NEW.expected_end_at::timestamptz - NEW.started_at::timestamptz)) / 60;

    IF actual_minutes > (expected_minutes * 2) THEN
      flags := array_append(flags, 'possibly_abandoned');
    END IF;

    IF actual_minutes < 5 THEN
      flags := array_append(flags, 'suspiciously_short');
    END IF;

    IF array_length(flags, 1) > 0 THEN
      NEW.anomaly_flags := flags;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_flag_session_anomalies
  BEFORE UPDATE ON public.linkedin_avatar_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.flag_session_anomalies();

-- Enable realtime for session_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.linkedin_avatar_session_jobs;

-- Indexes
CREATE INDEX idx_session_jobs_session_id ON public.linkedin_avatar_session_jobs(session_id);
CREATE INDEX idx_session_jobs_job_id ON public.linkedin_avatar_session_jobs(job_id);
CREATE INDEX idx_time_corrections_session_job ON public.linkedin_avatar_time_corrections(session_job_id);
