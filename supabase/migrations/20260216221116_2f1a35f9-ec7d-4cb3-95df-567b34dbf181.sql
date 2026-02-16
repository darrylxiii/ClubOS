
-- ═══════════════════════════════════════════════════════════
-- Account Traffic Control — LinkedIn Avatar Session Management
-- ═══════════════════════════════════════════════════════════

-- 1. linkedin_avatar_accounts
CREATE TABLE public.linkedin_avatar_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  linkedin_email text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','paused','banned','needs_review')),
  owner_team text,
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  max_daily_minutes integer NOT NULL DEFAULT 360,
  notes text,
  playbook text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. linkedin_avatar_sessions
CREATE TABLE public.linkedin_avatar_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.linkedin_avatar_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  expected_end_at timestamptz NOT NULL,
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','timeout','force_closed')),
  purpose text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: only one active session per account
CREATE UNIQUE INDEX idx_avatar_sessions_active_account
  ON public.linkedin_avatar_sessions (account_id)
  WHERE status = 'active';

-- 3. linkedin_avatar_events (audit log)
CREATE TABLE public.linkedin_avatar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.linkedin_avatar_accounts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_avatar_sessions_account ON public.linkedin_avatar_sessions(account_id);
CREATE INDEX idx_avatar_sessions_user ON public.linkedin_avatar_sessions(user_id);
CREATE INDEX idx_avatar_sessions_status ON public.linkedin_avatar_sessions(status);
CREATE INDEX idx_avatar_events_account ON public.linkedin_avatar_events(account_id);
CREATE INDEX idx_avatar_events_type ON public.linkedin_avatar_events(event_type);

-- updated_at trigger for accounts
CREATE TRIGGER update_linkedin_avatar_accounts_updated_at
  BEFORE UPDATE ON public.linkedin_avatar_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- Conflict prevention trigger
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_avatar_session_conflict()
RETURNS TRIGGER AS $$
DECLARE
  existing_session RECORD;
BEGIN
  -- Only check for new active sessions
  IF NEW.status = 'active' THEN
    SELECT s.id, p.full_name, s.expected_end_at
    INTO existing_session
    FROM public.linkedin_avatar_sessions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.account_id = NEW.account_id
      AND s.status = 'active'
      AND s.ended_at IS NULL
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Account is currently in use by % until %',
        existing_session.full_name,
        existing_session.expected_end_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_avatar_session_conflict
  BEFORE INSERT ON public.linkedin_avatar_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_avatar_session_conflict();

-- ═══════════════════════════════════════════════════════════
-- Auto-timeout function (callable from edge function cron)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.timeout_expired_avatar_sessions()
RETURNS integer AS $$
DECLARE
  timed_out integer;
BEGIN
  WITH expired AS (
    UPDATE public.linkedin_avatar_sessions
    SET status = 'timeout',
        ended_at = expected_end_at + interval '10 minutes'
    WHERE status = 'active'
      AND expected_end_at < now() - interval '10 minutes'
    RETURNING id, account_id, user_id
  ),
  log_events AS (
    INSERT INTO public.linkedin_avatar_events (account_id, user_id, event_type, metadata)
    SELECT account_id, user_id, 'session_timeout', jsonb_build_object('session_id', id)
    FROM expired
  )
  SELECT count(*) INTO timed_out FROM expired;

  -- Reset account status for timed-out sessions
  UPDATE public.linkedin_avatar_accounts a
  SET status = 'available'
  WHERE a.id IN (
    SELECT account_id FROM public.linkedin_avatar_sessions
    WHERE status = 'timeout' AND ended_at > now() - interval '1 minute'
  )
  AND a.status != 'banned'
  AND NOT EXISTS (
    SELECT 1 FROM public.linkedin_avatar_sessions s
    WHERE s.account_id = a.id AND s.status = 'active'
  );

  RETURN timed_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.linkedin_avatar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_avatar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_avatar_events ENABLE ROW LEVEL SECURITY;

-- Accounts: everyone authenticated can read, admins can write
CREATE POLICY "Authenticated users can view avatar accounts"
  ON public.linkedin_avatar_accounts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage avatar accounts"
  ON public.linkedin_avatar_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','strategist'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','strategist'))
  );

-- Sessions: authenticated can read all, can insert/update own
CREATE POLICY "Authenticated users can view avatar sessions"
  ON public.linkedin_avatar_sessions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create their own sessions"
  ON public.linkedin_avatar_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.linkedin_avatar_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Events: authenticated can read, system inserts
CREATE POLICY "Authenticated users can view avatar events"
  ON public.linkedin_avatar_events FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert avatar events"
  ON public.linkedin_avatar_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Realtime
-- ═══════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.linkedin_avatar_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.linkedin_avatar_accounts;
