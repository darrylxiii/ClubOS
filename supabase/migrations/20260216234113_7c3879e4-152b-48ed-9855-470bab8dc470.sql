
-- Phase 1: Expand linkedin_avatar_accounts with full Apify data fields
ALTER TABLE public.linkedin_avatar_accounts
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS top_skills text[],
  ADD COLUMN IF NOT EXISTS current_company text,
  ADD COLUMN IF NOT EXISTS current_company_url text,
  ADD COLUMN IF NOT EXISTS is_creator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_influencer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_to_work boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_identifier text,
  ADD COLUMN IF NOT EXISTS linkedin_urn text,
  ADD COLUMN IF NOT EXISTS account_created_at text,
  ADD COLUMN IF NOT EXISTS background_picture_url text,
  ADD COLUMN IF NOT EXISTS experience_json jsonb,
  ADD COLUMN IF NOT EXISTS education_json jsonb,
  ADD COLUMN IF NOT EXISTS featured_json jsonb,
  ADD COLUMN IF NOT EXISTS linkedin_email_from_scrape text,
  ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_usage_minutes_today integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sessions_today integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cooldown_at timestamptz;

-- Phase 5: Daily stats table for analytics
CREATE TABLE IF NOT EXISTS public.linkedin_avatar_daily_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid REFERENCES public.linkedin_avatar_accounts(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_sessions integer DEFAULT 0,
  total_minutes integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  peak_hour integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, date)
);

ALTER TABLE public.linkedin_avatar_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read avatar daily stats"
  ON public.linkedin_avatar_daily_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'strategist')
    )
  );

-- Phase 4: Smart risk engine DB function
CREATE OR REPLACE FUNCTION public.calculate_account_risk(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sessions_7d integer;
  v_avg_daily_sessions numeric;
  v_total_minutes_7d integer;
  v_avg_daily_minutes numeric;
  v_distinct_users integer;
  v_consecutive_days integer;
  v_risk_score integer := 0;
  v_risk_level text := 'low';
BEGIN
  SELECT count(*) INTO v_sessions_7d
  FROM linkedin_avatar_sessions
  WHERE account_id = p_account_id AND started_at > now() - interval '7 days';

  v_avg_daily_sessions := v_sessions_7d / 7.0;

  SELECT coalesce(sum(
    EXTRACT(EPOCH FROM (coalesce(ended_at, now()) - started_at)) / 60
  ), 0)::integer INTO v_total_minutes_7d
  FROM linkedin_avatar_sessions
  WHERE account_id = p_account_id AND started_at > now() - interval '7 days';

  v_avg_daily_minutes := v_total_minutes_7d / 7.0;

  SELECT count(DISTINCT user_id) INTO v_distinct_users
  FROM linkedin_avatar_sessions
  WHERE account_id = p_account_id AND started_at > now() - interval '7 days';

  SELECT count(DISTINCT date(started_at)) INTO v_consecutive_days
  FROM linkedin_avatar_sessions
  WHERE account_id = p_account_id AND started_at > now() - interval '7 days';

  IF v_avg_daily_sessions > 5 THEN v_risk_score := v_risk_score + 25;
  ELSIF v_avg_daily_sessions > 3 THEN v_risk_score := v_risk_score + 15;
  ELSIF v_avg_daily_sessions > 2 THEN v_risk_score := v_risk_score + 8;
  END IF;

  IF v_avg_daily_minutes > 600 THEN v_risk_score := v_risk_score + 30;
  ELSIF v_avg_daily_minutes > 360 THEN v_risk_score := v_risk_score + 20;
  ELSIF v_avg_daily_minutes > 180 THEN v_risk_score := v_risk_score + 10;
  END IF;

  IF v_consecutive_days >= 7 THEN v_risk_score := v_risk_score + 20;
  ELSIF v_consecutive_days >= 5 THEN v_risk_score := v_risk_score + 12;
  ELSIF v_consecutive_days >= 3 THEN v_risk_score := v_risk_score + 5;
  END IF;

  IF v_distinct_users > 4 THEN v_risk_score := v_risk_score + 15;
  ELSIF v_distinct_users > 2 THEN v_risk_score := v_risk_score + 8;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM linkedin_avatar_sessions
    WHERE account_id = p_account_id AND started_at > now() - interval '24 hours'
  ) THEN
    v_risk_score := GREATEST(v_risk_score - 10, 0);
  END IF;

  IF v_risk_score >= 50 THEN v_risk_level := 'high';
  ELSIF v_risk_score >= 25 THEN v_risk_level := 'medium';
  ELSE v_risk_level := 'low';
  END IF;

  UPDATE linkedin_avatar_accounts
  SET risk_score = v_risk_score, risk_level = v_risk_level
  WHERE id = p_account_id;
END;
$$;

-- Trigger to auto-calculate risk after session ends
CREATE OR REPLACE FUNCTION public.trigger_recalc_risk_on_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'timeout') AND (OLD.status = 'active') THEN
    PERFORM calculate_account_risk(NEW.account_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalc_risk_on_session_end ON public.linkedin_avatar_sessions;
CREATE TRIGGER recalc_risk_on_session_end
  AFTER UPDATE ON public.linkedin_avatar_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_risk_on_session_change();
