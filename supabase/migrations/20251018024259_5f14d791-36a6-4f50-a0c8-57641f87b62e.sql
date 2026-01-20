-- Fix mutable search_path in security definer functions
-- Ensure all SECURITY DEFINER functions have SET search_path

-- Update functions that may be missing search_path
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

CREATE OR REPLACE FUNCTION public.evaluate_user_achievements(_user_id uuid)
RETURNS TABLE(achievement_id uuid, achievement_name text, unlocked boolean, progress integer, target integer)
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