-- Create quantum achievement categories enum
CREATE TYPE achievement_category AS ENUM (
  'influence',
  'innovation',
  'social',
  'learning',
  'prestige',
  'event',
  'pioneer'
);

-- Create rarity enum
CREATE TYPE achievement_rarity AS ENUM (
  'common',
  'rare',
  'epic',
  'legendary',
  'quantum'
);

-- Create quantum achievements table
CREATE TABLE quantum_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category achievement_category NOT NULL,
  rarity achievement_rarity NOT NULL DEFAULT 'common',
  icon_emoji TEXT NOT NULL,
  unlock_criteria JSONB NOT NULL DEFAULT '{}',
  points INTEGER NOT NULL DEFAULT 0,
  animation_effect TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user achievements tracking
CREATE TABLE user_quantum_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES quantum_achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress JSONB DEFAULT '{}',
  is_showcased BOOLEAN DEFAULT false,
  showcase_position INTEGER,
  story_text TEXT,
  UNIQUE(user_id, achievement_id)
);

-- Create achievement reactions table
CREATE TABLE achievement_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_achievement_id UUID NOT NULL REFERENCES user_quantum_achievements(id) ON DELETE CASCADE,
  reactor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_achievement_id, reactor_id)
);

-- Enable RLS
ALTER TABLE quantum_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quantum_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quantum_achievements
CREATE POLICY "Anyone can view active achievements"
  ON quantum_achievements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage achievements"
  ON quantum_achievements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_quantum_achievements
CREATE POLICY "Users can view their own achievements"
  ON user_quantum_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view showcased achievements"
  ON user_quantum_achievements FOR SELECT
  USING (is_showcased = true);

CREATE POLICY "Users can update their own achievements"
  ON user_quantum_achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create user achievements"
  ON user_quantum_achievements FOR INSERT
  WITH CHECK (true);

-- RLS Policies for achievement_reactions
CREATE POLICY "Users can view reactions"
  ON achievement_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reactions"
  ON achievement_reactions FOR INSERT
  WITH CHECK (auth.uid() = reactor_id);

CREATE POLICY "Users can delete their own reactions"
  ON achievement_reactions FOR DELETE
  USING (auth.uid() = reactor_id);

-- Insert Quantum Club exclusive badges
INSERT INTO quantum_achievements (name, description, category, rarity, icon_emoji, unlock_criteria, points, animation_effect) VALUES
  ('Chrono Vanguard', 'First to publish content in the quarter', 'pioneer', 'legendary', '⏰', '{"type": "first_post_quarter"}', 500, 'time-ripple'),
  ('Social Superposition', 'Achieve multi-category milestones', 'social', 'epic', '🌀', '{"type": "multi_category", "count": 3}', 300, 'overlay-waves'),
  ('Hyperlink Luminary', 'Shared milestone reached by community', 'influence', 'rare', '✨', '{"type": "shared_milestone", "shares": 50}', 200, 'neon-pulses'),
  ('Circuit Mentor', 'Mentored 5 newcomers successfully', 'learning', 'epic', '🧠', '{"type": "mentor", "count": 5}', 350, 'circuit-patterns'),
  ('Quantum Oracle', 'Recognized by Admin Board', 'prestige', 'quantum', '👑', '{"type": "admin_recognition"}', 1000, 'crown-burst'),
  ('Resonance Architect', 'Created a viral workflow', 'innovation', 'legendary', '🔬', '{"type": "viral_content", "views": 10000}', 750, 'particle-swirl'),
  ('Spectral Host', 'Hosted a successful club event', 'event', 'epic', '🎭', '{"type": "host_event"}', 400, 'light-spectrum'),
  ('Early Adopter', 'Joined The Quantum Club', 'pioneer', 'common', '🌟', '{"type": "signup"}', 50, 'fade-in'),
  ('Consistent Creator', 'Maintained 7-day posting streak', 'social', 'rare', '🔥', '{"type": "streak", "days": 7}', 150, 'flame-pulse'),
  ('Social Butterfly', 'Published 10 quality posts', 'social', 'rare', '🦋', '{"type": "posts", "count": 10}', 100, 'butterfly-flutter'),
  ('Engagement Master', 'Reached Level 5', 'prestige', 'epic', '💎', '{"type": "level", "level": 5}', 250, 'diamond-sparkle'),
  ('Network Nexus', 'Connected with 50 members', 'influence', 'rare', '🌐', '{"type": "connections", "count": 50}', 200, 'network-expand'),
  ('Innovation Pioneer', 'First to try 3 new features', 'innovation', 'rare', '🚀', '{"type": "feature_adoption", "count": 3}', 180, 'rocket-launch');

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user ON user_quantum_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_quantum_achievements(unlocked_at DESC);
CREATE INDEX idx_achievements_category ON quantum_achievements(category);
CREATE INDEX idx_achievements_rarity ON quantum_achievements(rarity);

-- Create function to auto-award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER award_early_adopter
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_achievements();

CREATE TRIGGER check_streak_achievements
  AFTER UPDATE ON user_engagement
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_achievements();