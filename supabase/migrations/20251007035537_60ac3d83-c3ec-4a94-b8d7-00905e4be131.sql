-- Add achievement events tracking table
CREATE TABLE achievement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES quantum_achievements(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  progress_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Add achievement analytics table
CREATE TABLE achievement_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID NOT NULL REFERENCES quantum_achievements(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  unlock_count INTEGER DEFAULT 0,
  avg_time_to_unlock_hours NUMERIC,
  fastest_unlock_time_hours NUMERIC,
  total_attempts INTEGER DEFAULT 0,
  category_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(achievement_id, date)
);

-- Add user achievement progress tracking
CREATE TABLE achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES quantum_achievements(id) ON DELETE CASCADE,
  progress_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

-- Add privacy settings for achievements
ALTER TABLE user_quantum_achievements 
ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private'));

-- Add versioning to achievements
ALTER TABLE quantum_achievements
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_deprecated BOOLEAN DEFAULT false,
ADD COLUMN unlock_condition_json JSONB DEFAULT '{}';

-- Enable RLS
ALTER TABLE achievement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievement_events
CREATE POLICY "Users can view their own events"
  ON achievement_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create events"
  ON achievement_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all events"
  ON achievement_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for achievement_analytics
CREATE POLICY "Anyone can view analytics"
  ON achievement_analytics FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage analytics"
  ON achievement_analytics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for achievement_progress
CREATE POLICY "Users can view their own progress"
  ON achievement_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage progress"
  ON achievement_progress FOR ALL
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_achievement_events_user ON achievement_events(user_id, created_at DESC);
CREATE INDEX idx_achievement_events_achievement ON achievement_events(achievement_id, created_at DESC);
CREATE INDEX idx_achievement_events_unprocessed ON achievement_events(processed, created_at) WHERE processed = false;
CREATE INDEX idx_achievement_analytics_date ON achievement_analytics(date DESC);
CREATE INDEX idx_achievement_progress_user ON achievement_progress(user_id, last_updated DESC);

-- Function to log achievement events
CREATE OR REPLACE FUNCTION log_achievement_event(
  _user_id UUID,
  _event_type TEXT,
  _event_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO achievement_events (user_id, event_type, event_data)
  VALUES (_user_id, _event_type, _event_data)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update achievement analytics
CREATE OR REPLACE FUNCTION update_achievement_analytics()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for analytics
CREATE TRIGGER track_achievement_analytics
  AFTER UPDATE ON user_quantum_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_achievement_analytics();

-- Function to evaluate achievements (called by edge function)
CREATE OR REPLACE FUNCTION evaluate_user_achievements(_user_id UUID)
RETURNS TABLE(
  achievement_id UUID,
  achievement_name TEXT,
  unlocked BOOLEAN,
  progress INTEGER,
  target INTEGER
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;