-- Achievement tiers (bronze/silver/gold/platinum)
CREATE TABLE IF NOT EXISTS achievement_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_achievement_id UUID REFERENCES quantum_achievements(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL CHECK (tier_level BETWEEN 1 AND 4), -- 1=bronze, 2=silver, 3=gold, 4=platinum
  name TEXT NOT NULL,
  description TEXT,
  unlock_criteria JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  icon_emoji TEXT NOT NULL DEFAULT '🏆',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_achievement_id, tier_level)
);

-- Achievement prerequisites/paths (skill tree)
CREATE TABLE IF NOT EXISTS achievement_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID REFERENCES quantum_achievements(id) ON DELETE CASCADE,
  required_achievement_id UUID REFERENCES quantum_achievements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(achievement_id, required_achievement_id)
);

-- Daily/weekly challenges
CREATE TABLE IF NOT EXISTS achievement_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'special')),
  criteria JSONB NOT NULL,
  bonus_points INTEGER DEFAULT 50,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES achievement_challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Achievement leaderboard cache
CREATE TABLE IF NOT EXISTS achievement_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_achievements INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  rarest_achievement_id UUID REFERENCES quantum_achievements(id),
  rank_position INTEGER,
  weekly_achievements INTEGER DEFAULT 0,
  monthly_achievements INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add secret achievement columns
ALTER TABLE quantum_achievements ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;
ALTER TABLE quantum_achievements ADD COLUMN IF NOT EXISTS hint_text TEXT;
ALTER TABLE quantum_achievements ADD COLUMN IF NOT EXISTS animation_type TEXT DEFAULT 'default';

-- Add showcase customization
ALTER TABLE user_quantum_achievements ADD COLUMN IF NOT EXISTS showcase_position INTEGER;
ALTER TABLE user_quantum_achievements ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievement_tiers_base_id ON achievement_tiers(base_achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_prerequisites_achievement ON achievement_prerequisites(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_challenges_active ON achievement_challenges(is_active, challenge_type);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_leaderboard_rank ON achievement_leaderboard(rank_position);
CREATE INDEX IF NOT EXISTS idx_quantum_achievements_secret ON quantum_achievements(is_secret);

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_achievement_leaderboard_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_achievements INTEGER;
  v_total_xp INTEGER;
  v_rarest_achievement_id UUID;
  v_weekly_achievements INTEGER;
  v_monthly_achievements INTEGER;
BEGIN
  -- Count total achievements
  SELECT COUNT(*) INTO v_total_achievements
  FROM user_quantum_achievements
  WHERE user_id = p_user_id;

  -- Sum total XP
  SELECT COALESCE(SUM(qa.points), 0) INTO v_total_xp
  FROM user_quantum_achievements uqa
  JOIN quantum_achievements qa ON qa.id = uqa.achievement_id
  WHERE uqa.user_id = p_user_id;

  -- Find rarest achievement
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

  -- Count weekly achievements
  SELECT COUNT(*) INTO v_weekly_achievements
  FROM user_quantum_achievements
  WHERE user_id = p_user_id
    AND unlocked_at > NOW() - INTERVAL '7 days';

  -- Count monthly achievements
  SELECT COUNT(*) INTO v_monthly_achievements
  FROM user_quantum_achievements
  WHERE user_id = p_user_id
    AND unlocked_at > NOW() - INTERVAL '30 days';

  -- Upsert into leaderboard
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update all leaderboard ranks
CREATE OR REPLACE FUNCTION update_all_leaderboard_ranks()
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update leaderboard on achievement unlock
CREATE OR REPLACE FUNCTION trigger_update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_achievement_leaderboard_for_user(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_leaderboard_on_unlock
AFTER INSERT ON user_quantum_achievements
FOR EACH ROW
EXECUTE FUNCTION trigger_update_leaderboard();

-- RLS policies
ALTER TABLE achievement_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_leaderboard ENABLE ROW LEVEL SECURITY;

-- Everyone can view active tiers
CREATE POLICY "Anyone can view active achievement tiers"
ON achievement_tiers FOR SELECT
USING (is_active = true);

-- Everyone can view prerequisites
CREATE POLICY "Anyone can view achievement prerequisites"
ON achievement_prerequisites FOR SELECT
USING (true);

-- Everyone can view active challenges
CREATE POLICY "Anyone can view active challenges"
ON achievement_challenges FOR SELECT
USING (is_active = true);

-- Users can view their own challenge progress
CREATE POLICY "Users can view own challenge progress"
ON user_challenge_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own challenge progress
CREATE POLICY "Users can update own challenge progress"
ON user_challenge_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own challenge progress
CREATE POLICY "Users can insert own challenge progress"
ON user_challenge_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Everyone can view leaderboard
CREATE POLICY "Anyone can view leaderboard"
ON achievement_leaderboard FOR SELECT
USING (true);

-- Admins can manage everything
CREATE POLICY "Admins can manage tiers"
ON achievement_tiers FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can manage prerequisites"
ON achievement_prerequisites FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can manage challenges"
ON achievement_challenges FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
));