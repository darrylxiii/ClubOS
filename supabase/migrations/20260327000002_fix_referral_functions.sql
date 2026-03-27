-- Fix referral ranking/tier functions AND wire up auto-calculation trigger
-- The original functions referenced 'status = realized' and 're.amount'
-- but the referral_earnings table uses 'status = paid' and 'earned_amount'

-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Fix calculate_referral_rankings: wrong status value and column name
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  date_filter TIMESTAMPTZ;
BEGIN
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
      SUM(CASE WHEN re.status = 'paid' THEN re.earned_amount ELSE 0 END) as earned,
      COUNT(*) as total_refs,
      COUNT(CASE WHEN re.status = 'paid' THEN 1 END) as placements
    FROM public.referral_earnings re
    WHERE re.created_at >= date_filter
    GROUP BY re.referrer_id
  ),
  ranked AS (
    SELECT
      e.referrer_id,
      COALESCE(p.full_name, 'Anonymous') as dname,
      p.avatar_url as aurl,
      COALESCE(e.earned, 0) as total_earned,
      COALESCE(e.total_refs, 0)::INTEGER as total_referred,
      COALESCE(e.placements, 0)::INTEGER as successful_placements,
      CASE WHEN e.total_refs > 0
        THEN ROUND((e.placements::NUMERIC / e.total_refs) * 100, 2)
        ELSE 0
      END as success_rate,
      COALESCE(urs.is_leaderboard_visible, true) as is_anon,
      ROW_NUMBER() OVER (ORDER BY COALESCE(e.earned, 0) DESC, e.placements DESC) as rank_pos
    FROM earnings e
    LEFT JOIN public.profiles p ON e.referrer_id = p.id
    LEFT JOIN public.user_referral_stats urs ON e.referrer_id = urs.user_id
  )
  SELECT
    r.referrer_id,
    CASE WHEN r.is_anon THEN 'Anonymous Member'::TEXT ELSE r.dname END,
    CASE WHEN r.is_anon THEN NULL::TEXT ELSE r.aurl END,
    r.total_earned,
    r.total_referred,
    r.successful_placements,
    r.success_rate,
    r.rank_pos::INTEGER,
    r.is_anon
  FROM ranked r
  ORDER BY r.rank_pos
  LIMIT 100;
END;
$$;

-- Fix get_user_referral_tier: wrong status value
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_placements INTEGER;
  v_current_tier RECORD;
  v_next_tier RECORD;
BEGIN
  -- Count placements where earnings are paid (was 'realized', corrected to 'paid')
  SELECT COUNT(*) INTO v_placements
  FROM public.referral_earnings
  WHERE referrer_id = p_user_id AND status = 'paid';

  -- Get current tier based on placement count
  SELECT * INTO v_current_tier
  FROM public.referral_tiers
  WHERE min_placements <= v_placements
  ORDER BY tier_level DESC
  LIMIT 1;

  -- If no tier found, default to Bronze (tier_level 1)
  IF v_current_tier.id IS NULL THEN
    SELECT * INTO v_current_tier
    FROM public.referral_tiers
    ORDER BY tier_level ASC
    LIMIT 1;
  END IF;

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

-- Auto-trigger calculate-referral-earnings when application status changes
-- Uses pg_net to call the edge function asynchronously
CREATE OR REPLACE FUNCTION public.trigger_calculate_referral_earnings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if any referral policy exists for this application's job or company
    IF EXISTS (
      SELECT 1 FROM public.referral_policies rp
      WHERE rp.is_active = true
        AND (rp.job_id = NEW.job_id OR rp.company_id = NEW.company_id)
    ) THEN
      PERFORM extensions.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1)
               || '/functions/v1/calculate-referral-earnings',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
        ),
        body := jsonb_build_object(
          'application_id', NEW.id,
          'trigger_type', 'application_status_change'
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_status_calculate_referral_earnings ON public.applications;
CREATE TRIGGER on_application_status_calculate_referral_earnings
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_referral_earnings();
