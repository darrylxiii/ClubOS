-- Performance Optimization: Add critical missing indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_job_status 
  ON applications(user_id, job_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_applications_status_created 
  ON applications(status, created_at DESC) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_notifications_user_read 
  ON message_notifications(user_id, is_read) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_profiles_company_id 
  ON profiles(company_id) 
  WHERE company_id IS NOT NULL;

-- AI Matching System: Create match_scores table
CREATE TABLE IF NOT EXISTS match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  job_id uuid REFERENCES jobs NOT NULL,
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  required_criteria_met jsonb,
  required_criteria_total integer,
  preferred_criteria_met jsonb,
  preferred_criteria_total integer,
  club_match_factors jsonb,
  club_match_score integer,
  additional_factors jsonb,
  gaps jsonb,
  hard_stops jsonb,
  quick_wins jsonb,
  longer_term_actions jsonb,
  calculated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_match_scores_user_score ON match_scores(user_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_scores_job ON match_scores(job_id);

-- Enable RLS
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own match scores" ON match_scores;
CREATE POLICY "Users can view their own match scores"
  ON match_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert match scores" ON match_scores;
CREATE POLICY "System can insert match scores"
  ON match_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update match scores" ON match_scores;
CREATE POLICY "System can update match scores"
  ON match_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);