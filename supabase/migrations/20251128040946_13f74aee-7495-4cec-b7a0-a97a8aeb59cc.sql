-- Fix search_path for functions - drop in correct order
DROP TRIGGER IF EXISTS update_leaderboard_on_unlock ON user_quantum_achievements;
DROP FUNCTION IF EXISTS trigger_update_leaderboard();
DROP FUNCTION IF EXISTS update_achievement_leaderboard_for_user(UUID);
DROP FUNCTION IF EXISTS update_all_leaderboard_ranks();

-- Function to update leaderboard with proper search_path
CREATE OR REPLACE FUNCTION update_achievement_leaderboard_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_achievements INTEGER;
  v_total_xp INTEGER;
  v_rarest_achievement_id UUID;
  v_weekly_achievements INTEGER;
  v_monthly_achievements INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_achievements
  FROM user_quantum_achievements
  WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(qa.points), 0) INTO v_total_xp
  FROM user_quantum_achievements uqa
  JOIN quantum_achievements qa ON qa.id = uqa.achievement_id
  WHERE uqa.user_id = p_user_id;

  SELECT uqa.achievement_id INTO v_rarest_achievement_id
  FROM user_quantum_achievements uqa
  JOIN quantum_achievements qa ON qa.id = uqa.achievement_id
  WHERE uqa.user_id = p_user_id
  ORDER BY 
    CASE qa.rarity
      WHEN 'quantum' THEN 5
      WHEN 'legendary' THEN 4
      WHEN 'epic' THEN 3
      WHEN 'rare' THEN 2
      ELSE 1
    END DESC
  LIMIT 1;

  SELECT COUNT(*) INTO v_weekly_achievements
  FROM user_quantum_achievements
  WHERE user_id = p_user_id
    AND unlocked_at > NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_monthly_achievements
  FROM user_quantum_achievements
  WHERE user_id = p_user_id
    AND unlocked_at > NOW() - INTERVAL '30 days';

  INSERT INTO achievement_leaderboard (
    user_id, 
    total_achievements, 
    total_xp, 
    rarest_achievement_id,
    weekly_achievements,
    monthly_achievements,
    last_updated
  ) VALUES (
    p_user_id,
    v_total_achievements,
    v_total_xp,
    v_rarest_achievement_id,
    v_weekly_achievements,
    v_monthly_achievements,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_achievements = v_total_achievements,
    total_xp = v_total_xp,
    rarest_achievement_id = v_rarest_achievement_id,
    weekly_achievements = v_weekly_achievements,
    monthly_achievements = v_monthly_achievements,
    last_updated = NOW();
END;
$$;

-- Function to update all leaderboard ranks with proper search_path
CREATE OR REPLACE FUNCTION update_all_leaderboard_ranks()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC, total_achievements DESC) as rank
    FROM achievement_leaderboard
  )
  UPDATE achievement_leaderboard al
  SET rank_position = ranked.rank
  FROM ranked
  WHERE al.user_id = ranked.user_id;
END;
$$;

-- Trigger function with proper search_path
CREATE OR REPLACE FUNCTION trigger_update_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM update_achievement_leaderboard_for_user(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_leaderboard_on_unlock
AFTER INSERT ON user_quantum_achievements
FOR EACH ROW
EXECUTE FUNCTION trigger_update_leaderboard();