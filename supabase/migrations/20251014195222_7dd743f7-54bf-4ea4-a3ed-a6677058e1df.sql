-- Phase 3: Legal & Compliance Tables

-- Content licensing and attribution
CREATE TABLE IF NOT EXISTS content_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_type TEXT NOT NULL,
  license_name TEXT NOT NULL,
  license_url TEXT,
  allows_commercial BOOLEAN DEFAULT false,
  allows_modification BOOLEAN DEFAULT false,
  requires_attribution BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  original_source TEXT,
  original_author TEXT,
  original_url TEXT,
  license_id UUID REFERENCES content_licenses(id),
  attribution_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Legal compliance tracking
CREATE TABLE IF NOT EXISTS compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  review_status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  compliance_issues JSONB DEFAULT '[]',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 4: Personalization & Analytics

-- Enhanced learner profiles
ALTER TABLE learner_progress ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;
ALTER TABLE learner_progress ADD COLUMN IF NOT EXISTS quiz_scores JSONB DEFAULT '[]';
ALTER TABLE learner_progress ADD COLUMN IF NOT EXISTS notes TEXT;

-- Learning preferences
CREATE TABLE IF NOT EXISTS learner_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_difficulty TEXT DEFAULT 'intermediate',
  learning_pace TEXT DEFAULT 'moderate',
  preferred_content_types JSONB DEFAULT '["video", "text", "interactive"]',
  learning_goals JSONB DEFAULT '[]',
  interests JSONB DEFAULT '[]',
  daily_learning_minutes INTEGER DEFAULT 30,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recommendations
CREATE TABLE IF NOT EXISTS content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_type TEXT NOT NULL,
  recommended_id UUID NOT NULL,
  recommendation_score NUMERIC DEFAULT 0,
  recommendation_reason TEXT,
  viewed BOOLEAN DEFAULT false,
  enrolled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Learning analytics
CREATE TABLE IF NOT EXISTS learning_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  modules_completed INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  quiz_success_rate NUMERIC DEFAULT 0,
  courses_enrolled INTEGER DEFAULT 0,
  courses_completed INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  engagement_score NUMERIC DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Phase 5: Community & Scale

-- Module Q&A forums
CREATE TABLE IF NOT EXISTS module_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES module_discussions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_expert_answer BOOLEAN DEFAULT false,
  is_accepted_answer BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expert connections
CREATE TABLE IF NOT EXISTS expert_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID REFERENCES expert_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS expert_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID REFERENCES expert_profiles(id),
  learner_id UUID REFERENCES auth.users(id),
  module_id UUID REFERENCES modules(id),
  session_type TEXT DEFAULT 'consultation',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'scheduled',
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Badges and achievements
CREATE TABLE IF NOT EXISTS learning_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_name TEXT NOT NULL UNIQUE,
  badge_description TEXT,
  badge_icon TEXT,
  criteria JSONB NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES learning_badges(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE content_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Content licenses (public read, admin manage)
CREATE POLICY "Anyone can view licenses" ON content_licenses FOR SELECT USING (true);
CREATE POLICY "Admins can manage licenses" ON content_licenses FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Content attributions (public read, experts/admins manage)
CREATE POLICY "Anyone can view attributions" ON content_attributions FOR SELECT USING (true);
CREATE POLICY "Experts can manage attributions" ON content_attributions FOR ALL 
  USING (has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM expert_profiles WHERE user_id = auth.uid()
  ));

-- Compliance reviews (admins only)
CREATE POLICY "Admins can manage compliance reviews" ON compliance_reviews FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- Learner preferences (users manage their own)
CREATE POLICY "Users manage their preferences" ON learner_preferences FOR ALL 
  USING (user_id = auth.uid());

-- Recommendations (users view their own)
CREATE POLICY "Users view their recommendations" ON content_recommendations FOR SELECT 
  USING (user_id = auth.uid());
CREATE POLICY "System creates recommendations" ON content_recommendations FOR INSERT 
  WITH CHECK (true);

-- Analytics (users view their own, admins view all)
CREATE POLICY "Users view their analytics" ON learning_analytics FOR SELECT 
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Discussions (public read, authenticated create)
CREATE POLICY "Anyone can view discussions" ON module_discussions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create discussions" ON module_discussions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their discussions" ON module_discussions FOR UPDATE 
  USING (auth.uid() = user_id);

-- Replies (public read, authenticated create)
CREATE POLICY "Anyone can view replies" ON discussion_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can reply" ON discussion_replies FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their replies" ON discussion_replies FOR UPDATE 
  USING (auth.uid() = user_id);

-- Expert availability (public read, experts manage)
CREATE POLICY "Anyone can view expert availability" ON expert_availability FOR SELECT USING (true);
CREATE POLICY "Experts manage their availability" ON expert_availability FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM expert_profiles WHERE user_id = auth.uid() AND id = expert_availability.expert_id
  ));

-- Expert sessions (participants can view, experts manage)
CREATE POLICY "Participants view their sessions" ON expert_sessions FOR SELECT 
  USING (
    learner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM expert_profiles WHERE user_id = auth.uid() AND id = expert_sessions.expert_id)
  );
CREATE POLICY "Learners can book sessions" ON expert_sessions FOR INSERT 
  WITH CHECK (learner_id = auth.uid());
CREATE POLICY "Experts manage their sessions" ON expert_sessions FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM expert_profiles WHERE user_id = auth.uid() AND id = expert_sessions.expert_id
  ));

-- Badges (public read, admins manage)
CREATE POLICY "Anyone can view badges" ON learning_badges FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON learning_badges FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- User badges (users view their own and others)
CREATE POLICY "Anyone can view user badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System awards badges" ON user_badges FOR INSERT WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_compliance_reviews_updated_at BEFORE UPDATE ON compliance_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learner_preferences_updated_at BEFORE UPDATE ON learner_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_discussions_updated_at BEFORE UPDATE ON module_discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON discussion_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default licenses
INSERT INTO content_licenses (license_type, license_name, license_url, allows_commercial, allows_modification, requires_attribution) VALUES
  ('CC0', 'Public Domain', 'https://creativecommons.org/publicdomain/zero/1.0/', true, true, false),
  ('CC-BY', 'Attribution 4.0', 'https://creativecommons.org/licenses/by/4.0/', true, true, true),
  ('CC-BY-SA', 'Attribution-ShareAlike 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', true, true, true),
  ('CC-BY-NC', 'Attribution-NonCommercial 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/', false, true, true),
  ('proprietary', 'All Rights Reserved', NULL, false, false, true)
ON CONFLICT DO NOTHING;

-- Insert starter badges
INSERT INTO learning_badges (badge_name, badge_description, badge_icon, criteria, points) VALUES
  ('First Module', 'Complete your first module', 'Award', '{"modules_completed": 1}', 10),
  ('Course Finisher', 'Complete an entire course', 'GraduationCap', '{"courses_completed": 1}', 50),
  ('Week Streak', 'Learn for 7 days in a row', 'Flame', '{"streak_days": 7}', 25),
  ('Expert Learner', 'Complete 10 modules', 'Star', '{"modules_completed": 10}', 100),
  ('Community Helper', 'Provide 5 helpful answers', 'Heart', '{"helpful_replies": 5}', 30)
ON CONFLICT DO NOTHING;