-- Fix SECURITY DEFINER functions missing search_path setting
-- This prevents search path manipulation attacks

-- Fix check_and_award_achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award "Early Adopter" on signup
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' THEN
    INSERT INTO user_quantum_achievements (user_id, achievement_id)
    SELECT NEW.id, id FROM quantum_achievements WHERE name = 'Early Adopter'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check streak achievements
  IF TG_TABLE_NAME = 'user_engagement' THEN
    IF NEW.current_streak >= 7 THEN
      INSERT INTO user_quantum_achievements (user_id, achievement_id)
      SELECT NEW.user_id, id FROM quantum_achievements WHERE name = 'Consistent Creator'
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix log_achievement_event
CREATE OR REPLACE FUNCTION public.log_achievement_event(_user_id uuid, _event_type text, _event_data jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO achievement_events (user_id, event_type, event_data)
  VALUES (_user_id, _event_type, _event_data)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Fix update_achievement_analytics
CREATE OR REPLACE FUNCTION public.update_achievement_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  time_to_unlock NUMERIC;
BEGIN
  IF NEW.unlocked_at IS NOT NULL AND OLD.unlocked_at IS NULL THEN
    -- Calculate time to unlock
    SELECT EXTRACT(EPOCH FROM (NEW.unlocked_at - NEW.created_at)) / 3600
    INTO time_to_unlock;
    
    -- Update analytics
    INSERT INTO achievement_analytics (
      achievement_id,
      date,
      unlock_count,
      avg_time_to_unlock_hours,
      fastest_unlock_time_hours,
      total_attempts
    )
    VALUES (
      (SELECT achievement_id FROM user_quantum_achievements WHERE id = NEW.id),
      CURRENT_DATE,
      1,
      time_to_unlock,
      time_to_unlock,
      1
    )
    ON CONFLICT (achievement_id, date)
    DO UPDATE SET
      unlock_count = achievement_analytics.unlock_count + 1,
      avg_time_to_unlock_hours = (
        (achievement_analytics.avg_time_to_unlock_hours * achievement_analytics.unlock_count + time_to_unlock) / 
        (achievement_analytics.unlock_count + 1)
      ),
      fastest_unlock_time_hours = LEAST(achievement_analytics.fastest_unlock_time_hours, time_to_unlock),
      total_attempts = achievement_analytics.total_attempts + 1,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix evaluate_user_achievements
CREATE OR REPLACE FUNCTION public.evaluate_user_achievements(_user_id uuid)
RETURNS TABLE(
  achievement_id uuid,
  achievement_name text,
  unlocked boolean,
  progress integer,
  target integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.id as achievement_id,
    qa.name as achievement_name,
    EXISTS(
      SELECT 1 FROM user_quantum_achievements 
      WHERE user_id = _user_id AND achievement_id = qa.id
    ) as unlocked,
    COALESCE(ap.progress_value, 0) as progress,
    CAST(qa.unlock_criteria->>'target' AS INTEGER) as target
  FROM quantum_achievements qa
  LEFT JOIN achievement_progress ap ON ap.achievement_id = qa.id AND ap.user_id = _user_id
  WHERE qa.is_active = true AND qa.is_deprecated = false;
END;
$$;

-- Fix calculate_post_score
CREATE OR REPLACE FUNCTION public.calculate_post_score(
  p_user_id uuid,
  p_post_id uuid,
  p_post_created_at timestamp with time zone,
  p_post_author_id uuid,
  p_likes_count integer,
  p_comments_count integer,
  p_shares_count integer
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recency_score NUMERIC := 0;
  relationship_score NUMERIC := 0;
  engagement_score NUMERIC := 0;
  total_score NUMERIC := 0;
  hours_old NUMERIC;
BEGIN
  -- Recency score (30% weight) - exponential decay
  hours_old := EXTRACT(EPOCH FROM (now() - p_post_created_at)) / 3600;
  recency_score := 30 * EXP(-hours_old / 24); -- Decays over 24 hours
  
  -- Relationship score (40% weight)
  SELECT COALESCE(relationship_score, 0) * 0.4 INTO relationship_score
  FROM public.user_relationships
  WHERE user_id = p_user_id AND related_user_id = p_post_author_id;
  
  -- Engagement score (30% weight)
  engagement_score := (p_likes_count * 1 + p_comments_count * 3 + p_shares_count * 5) * 0.3;
  
  -- Total score
  total_score := recency_score + COALESCE(relationship_score, 0) + engagement_score;
  
  RETURN total_score;
END;
$$;

-- Fix update_relationship_score
CREATE OR REPLACE FUNCTION public.update_relationship_score(
  p_user_id uuid,
  p_related_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_relationships (
    user_id,
    related_user_id,
    relationship_score,
    last_interaction_at
  )
  VALUES (
    p_user_id,
    p_related_user_id,
    5, -- Initial score
    now()
  )
  ON CONFLICT (user_id, related_user_id)
  DO UPDATE SET
    relationship_score = user_relationships.relationship_score + 5,
    last_interaction_at = now(),
    updated_at = now();
END;
$$;

-- Fix generate_share_token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure random token using gen_random_uuid and md5
  token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  RETURN encode(decode(token, 'hex'), 'base64');
END;
$$;