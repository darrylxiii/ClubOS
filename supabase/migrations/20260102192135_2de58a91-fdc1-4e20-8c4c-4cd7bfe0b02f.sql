-- =============================================
-- ENTERPRISE REFERRAL SYSTEM ENHANCEMENTS
-- =============================================

-- 1. Referral Leaderboard Cache Table
CREATE TABLE IF NOT EXISTS public.referral_leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('week', 'month', 'year', 'all_time')),
  total_earned NUMERIC(12,2) DEFAULT 0,
  total_referred INTEGER DEFAULT 0,
  successful_placements INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  rank_position INTEGER DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT false,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period)
);

-- 2. Referral Tiers Table
CREATE TABLE IF NOT EXISTS public.referral_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE,
  tier_level INTEGER NOT NULL UNIQUE,
  min_placements INTEGER NOT NULL DEFAULT 0,
  bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 10,
  perks JSONB DEFAULT '[]'::jsonb,
  badge_color TEXT DEFAULT '#C9A24E',
  badge_icon TEXT DEFAULT 'award',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default tiers
INSERT INTO public.referral_tiers (tier_name, tier_level, min_placements, bonus_percentage, perks, badge_color, badge_icon) VALUES
  ('Bronze', 1, 0, 10, '["Standard referral tracking", "Basic analytics"]', '#CD7F32', 'medal'),
  ('Silver', 2, 3, 12, '["Early job access", "Priority notifications", "Enhanced analytics"]', '#C0C0C0', 'award'),
  ('Gold', 3, 10, 15, '["Priority support", "Exclusive job previews", "Advanced insights"]', '#FFD700', 'trophy'),
  ('Platinum', 4, 25, 18, '["VIP events access", "Personal dashboard", "Direct recruiter contact"]', '#E5E4E2', 'crown'),
  ('Diamond', 5, 50, 20, '["Account manager", "Custom campaigns", "Maximum bonus rates", "Elite status"]', '#B9F2FF', 'gem')
ON CONFLICT (tier_name) DO NOTHING;

-- 3. Referral Challenges Table
CREATE TABLE IF NOT EXISTS public.referral_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('volume', 'speed', 'company_specific', 'category')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  reward_pool NUMERIC(12,2) DEFAULT 0,
  bonus_percentage NUMERIC(5,2) DEFAULT 0,
  winner_count INTEGER DEFAULT 3,
  target_company_id UUID REFERENCES public.companies(id),
  target_category TEXT,
  criteria JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Challenge Participants Table
CREATE TABLE IF NOT EXISTS public.referral_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.referral_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  referrals_count INTEGER DEFAULT 0,
  placements_count INTEGER DEFAULT 0,
  earnings_amount NUMERIC(12,2) DEFAULT 0,
  rank_position INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- 5. Referral Activity Feed Table
CREATE TABLE IF NOT EXISTS public.referral_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('referral_submitted', 'stage_advanced', 'placement_made', 'earnings_paid', 'tier_upgrade', 'achievement_unlocked', 'challenge_joined', 'challenge_won')),
  user_id UUID,
  is_anonymous BOOLEAN DEFAULT true,
  event_data JSONB DEFAULT '{}'::jsonb,
  display_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. User Referral Stats Table (for quick lookups)
CREATE TABLE IF NOT EXISTS public.user_referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_tier_id UUID REFERENCES public.referral_tiers(id),
  total_referrals INTEGER DEFAULT 0,
  successful_placements INTEGER DEFAULT 0,
  total_earned NUMERIC(12,2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  is_leaderboard_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Referral Share Tracking Table
CREATE TABLE IF NOT EXISTS public.referral_share_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id),
  share_channel TEXT NOT NULL CHECK (share_channel IN ('linkedin', 'whatsapp', 'email', 'sms', 'twitter', 'copy', 'qr_code', 'other')),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  clicks_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_share_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Leaderboard visible to all authenticated" ON public.referral_leaderboard_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tiers visible to all" ON public.referral_tiers
  FOR SELECT USING (true);

CREATE POLICY "Challenges visible to authenticated" ON public.referral_challenges
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Challenge participants visible to authenticated" ON public.referral_challenge_participants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can join challenges" ON public.referral_challenge_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Activity feed visible to authenticated" ON public.referral_activity_feed
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view own stats" ON public.user_referral_stats
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can update own stats visibility" ON public.user_referral_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can track own shares" ON public.referral_share_tracking
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_rank ON public.referral_leaderboard_cache(period, rank_position);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON public.referral_challenges(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_rank ON public.referral_challenge_participants(challenge_id, rank_position);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.referral_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_tracking_user ON public.referral_share_tracking(user_id, created_at DESC);

-- Function to calculate referral rankings
CREATE OR REPLACE FUNCTION public.calculate_referral_rankings(p_period TEXT DEFAULT 'all_time')
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_earned NUMERIC,
  total_referred INTEGER,
  successful_placements INTEGER,
  success_rate NUMERIC,
  rank_position INTEGER,
  is_anonymous BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  date_filter TIMESTAMPTZ;
BEGIN
  -- Set date filter based on period
  date_filter := CASE p_period
    WHEN 'week' THEN now() - INTERVAL '7 days'
    WHEN 'month' THEN now() - INTERVAL '30 days'
    WHEN 'year' THEN now() - INTERVAL '365 days'
    ELSE '1970-01-01'::TIMESTAMPTZ
  END;

  RETURN QUERY
  WITH earnings AS (
    SELECT 
      re.referrer_id,
      SUM(CASE WHEN re.status = 'realized' THEN re.amount ELSE 0 END) as earned,
      COUNT(*) as total_refs,
      COUNT(CASE WHEN re.status = 'realized' THEN 1 END) as placements
    FROM public.referral_earnings re
    WHERE re.created_at >= date_filter
    GROUP BY re.referrer_id
  ),
  ranked AS (
    SELECT 
      e.referrer_id,
      COALESCE(p.full_name, 'Anonymous') as display_name,
      p.avatar_url,
      COALESCE(e.earned, 0) as total_earned,
      COALESCE(e.total_refs, 0)::INTEGER as total_referred,
      COALESCE(e.placements, 0)::INTEGER as successful_placements,
      CASE WHEN e.total_refs > 0 
        THEN ROUND((e.placements::NUMERIC / e.total_refs) * 100, 2) 
        ELSE 0 
      END as success_rate,
      COALESCE(urs.is_leaderboard_visible, true) as is_anonymous,
      ROW_NUMBER() OVER (ORDER BY COALESCE(e.earned, 0) DESC, e.placements DESC) as rank_pos
    FROM earnings e
    LEFT JOIN public.profiles p ON e.referrer_id = p.id
    LEFT JOIN public.user_referral_stats urs ON e.referrer_id = urs.user_id
  )
  SELECT 
    r.referrer_id as user_id,
    CASE WHEN r.is_anonymous THEN 'Anonymous Member' ELSE r.display_name END,
    CASE WHEN r.is_anonymous THEN NULL ELSE r.avatar_url END,
    r.total_earned,
    r.total_referred,
    r.successful_placements,
    r.success_rate,
    r.rank_pos::INTEGER as rank_position,
    r.is_anonymous
  FROM ranked r
  ORDER BY r.rank_pos
  LIMIT 100;
END;
$$;

-- Function to get user's current tier
CREATE OR REPLACE FUNCTION public.get_user_referral_tier(p_user_id UUID)
RETURNS TABLE (
  tier_id UUID,
  tier_name TEXT,
  tier_level INTEGER,
  bonus_percentage NUMERIC,
  perks JSONB,
  badge_color TEXT,
  badge_icon TEXT,
  placements_to_next INTEGER,
  next_tier_name TEXT,
  progress_percentage NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_placements INTEGER;
  v_current_tier RECORD;
  v_next_tier RECORD;
BEGIN
  -- Get user's placement count
  SELECT COUNT(*) INTO v_placements
  FROM public.referral_earnings
  WHERE referrer_id = p_user_id AND status = 'realized';

  -- Get current tier
  SELECT * INTO v_current_tier
  FROM public.referral_tiers
  WHERE min_placements <= v_placements
  ORDER BY tier_level DESC
  LIMIT 1;

  -- Get next tier
  SELECT * INTO v_next_tier
  FROM public.referral_tiers
  WHERE tier_level = v_current_tier.tier_level + 1;

  RETURN QUERY
  SELECT 
    v_current_tier.id,
    v_current_tier.tier_name,
    v_current_tier.tier_level,
    v_current_tier.bonus_percentage,
    v_current_tier.perks,
    v_current_tier.badge_color,
    v_current_tier.badge_icon,
    CASE WHEN v_next_tier.id IS NOT NULL 
      THEN v_next_tier.min_placements - v_placements 
      ELSE 0 
    END,
    v_next_tier.tier_name,
    CASE WHEN v_next_tier.id IS NOT NULL 
      THEN ROUND(
        ((v_placements - v_current_tier.min_placements)::NUMERIC / 
        NULLIF(v_next_tier.min_placements - v_current_tier.min_placements, 0)) * 100, 2
      )
      ELSE 100 
    END;
END;
$$;

-- Function to get active challenges
CREATE OR REPLACE FUNCTION public.get_active_referral_challenges()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  challenge_type TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  reward_pool NUMERIC,
  bonus_percentage NUMERIC,
  winner_count INTEGER,
  participants_count BIGINT,
  time_remaining INTERVAL,
  user_rank INTEGER,
  user_progress JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.challenge_type,
    c.start_date,
    c.end_date,
    c.reward_pool,
    c.bonus_percentage,
    c.winner_count,
    (SELECT COUNT(*) FROM public.referral_challenge_participants WHERE challenge_id = c.id),
    c.end_date - now() as time_remaining,
    (SELECT rcp.rank_position FROM public.referral_challenge_participants rcp WHERE rcp.challenge_id = c.id AND rcp.user_id = auth.uid()),
    (SELECT jsonb_build_object(
      'referrals', rcp.referrals_count,
      'placements', rcp.placements_count,
      'earnings', rcp.earnings_amount
    ) FROM public.referral_challenge_participants rcp WHERE rcp.challenge_id = c.id AND rcp.user_id = auth.uid())
  FROM public.referral_challenges c
  WHERE c.is_active = true 
    AND c.end_date > now()
    AND c.start_date <= now()
  ORDER BY c.end_date ASC;
END;
$$;

-- Trigger to log referral activity
CREATE OR REPLACE FUNCTION public.log_referral_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.referral_activity_feed (event_type, user_id, is_anonymous, event_data, display_message)
    VALUES (
      'referral_submitted',
      NEW.referrer_id,
      true,
      jsonb_build_object('job_id', NEW.job_id, 'amount', NEW.amount),
      'A new referral was just submitted'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'realized' AND OLD.status != 'realized' THEN
    INSERT INTO public.referral_activity_feed (event_type, user_id, is_anonymous, event_data, display_message)
    VALUES (
      'placement_made',
      NEW.referrer_id,
      true,
      jsonb_build_object('amount', NEW.amount),
      format('A placement was made - €%s earned', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_referral_activity ON public.referral_earnings;
CREATE TRIGGER trigger_log_referral_activity
  AFTER INSERT OR UPDATE ON public.referral_earnings
  FOR EACH ROW EXECUTE FUNCTION public.log_referral_activity();

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_activity_feed;