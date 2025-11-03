-- Pressure Cooker Assessment Tables
CREATE TABLE pressure_cooker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_seed TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  tasks_presented JSONB NOT NULL,
  total_tasks INTEGER,
  completed_tasks INTEGER,
  completion_rate NUMERIC,
  avg_response_time_ms INTEGER,
  prioritization_accuracy NUMERIC,
  stress_handling_score NUMERIC,
  multitasking_ability NUMERIC,
  decision_quality NUMERIC,
  communication_style TEXT
);

CREATE TABLE pressure_cooker_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES pressure_cooker_sessions(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp_ms BIGINT NOT NULL,
  time_spent_ms INTEGER,
  quality_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blind Spot Detector Assessment Tables
CREATE TABLE blind_spot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  self_ratings JSONB NOT NULL,
  scenario_responses JSONB NOT NULL,
  objective_scores JSONB,
  awareness_gaps JSONB,
  overall_self_awareness_score NUMERIC,
  coachability_indicator NUMERIC,
  top_blind_spots TEXT[],
  hidden_strengths TEXT[]
);

-- Values Poker Assessment Tables
CREATE TABLE values_poker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stated_priorities JSONB NOT NULL,
  tradeoff_responses JSONB NOT NULL,
  revealed_priorities JSONB,
  consistency_score NUMERIC,
  value_archetype TEXT,
  culture_fit_scores JSONB,
  red_flags TEXT[]
);

-- Unified Assessment Profile
CREATE TABLE candidate_assessment_profiles (
  user_id UUID PRIMARY KEY,
  prioritization_skill NUMERIC,
  stress_resilience NUMERIC,
  multitasking_ability NUMERIC,
  communication_style TEXT,
  self_awareness_score NUMERIC,
  coachability_score NUMERIC,
  top_blind_spots TEXT[],
  hidden_strengths TEXT[],
  dimension_scores JSONB,
  value_consistency_score NUMERIC,
  value_archetype TEXT,
  top_values TEXT[],
  culture_fit_scores JSONB,
  last_updated TIMESTAMPTZ DEFAULT now(),
  assessments_completed INTEGER DEFAULT 0
);

-- RLS Policies for Pressure Cooker
ALTER TABLE pressure_cooker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pressure_cooker_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pressure cooker sessions"
  ON pressure_cooker_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pressure cooker sessions"
  ON pressure_cooker_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pressure cooker sessions"
  ON pressure_cooker_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own pressure cooker actions"
  ON pressure_cooker_actions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM pressure_cooker_sessions
      WHERE pressure_cooker_sessions.id = pressure_cooker_actions.session_id
      AND pressure_cooker_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own pressure cooker actions"
  ON pressure_cooker_actions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM pressure_cooker_sessions
      WHERE pressure_cooker_sessions.id = pressure_cooker_actions.session_id
      AND pressure_cooker_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for Blind Spot
ALTER TABLE blind_spot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blind spot sessions"
  ON blind_spot_sessions FOR ALL
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for Values Poker
ALTER TABLE values_poker_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own values poker sessions"
  ON values_poker_sessions FOR ALL
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for Assessment Profiles
ALTER TABLE candidate_assessment_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessment profile"
  ON candidate_assessment_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own assessment profile"
  ON candidate_assessment_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessment profile"
  ON candidate_assessment_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for Performance
CREATE INDEX idx_pressure_cooker_sessions_user ON pressure_cooker_sessions(user_id, started_at DESC);
CREATE INDEX idx_pressure_cooker_actions_session ON pressure_cooker_actions(session_id, timestamp_ms);
CREATE INDEX idx_blind_spot_sessions_user ON blind_spot_sessions(user_id, started_at DESC);
CREATE INDEX idx_values_poker_sessions_user ON values_poker_sessions(user_id, started_at DESC);

-- Trigger to update profile when any assessment completes
CREATE OR REPLACE FUNCTION update_candidate_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO candidate_assessment_profiles (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    assessments_completed = candidate_assessment_profiles.assessments_completed + 1,
    last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pressure_cooker_completion
  AFTER INSERT ON pressure_cooker_sessions
  FOR EACH ROW EXECUTE FUNCTION update_candidate_profile();

CREATE TRIGGER blind_spot_completion
  AFTER INSERT ON blind_spot_sessions
  FOR EACH ROW EXECUTE FUNCTION update_candidate_profile();

CREATE TRIGGER values_poker_completion
  AFTER INSERT ON values_poker_sessions
  FOR EACH ROW EXECUTE FUNCTION update_candidate_profile();