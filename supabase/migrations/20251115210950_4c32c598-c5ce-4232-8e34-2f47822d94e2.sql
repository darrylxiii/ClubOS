-- Club Pilot AI Task Engine Tables
-- Core task management with auto-prioritization

CREATE TABLE IF NOT EXISTS pilot_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('review_candidate', 'schedule_interview', 'send_update', 'follow_up', 'review_application', 'prepare_interview', 'send_offer')),
  title TEXT NOT NULL,
  description TEXT,
  priority_score NUMERIC NOT NULL DEFAULT 0, -- Calculated: Impact(0.35) + Urgency(0.2) + Due(0.2) + RoleValue(0.2) - Effort(0.03) - Load(0.02)
  impact_score NUMERIC DEFAULT 0,
  urgency_score NUMERIC DEFAULT 0,
  effort_minutes INTEGER DEFAULT 15,
  auto_scheduled_at TIMESTAMPTZ,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  context JSONB NOT NULL DEFAULT '{}', -- Job, candidate, company data
  ai_recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'snoozed')),
  related_entity_type TEXT, -- 'application', 'job', 'candidate', 'interview'
  related_entity_id UUID,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pilot_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  work_hours_start TIME NOT NULL DEFAULT '09:00',
  work_hours_end TIME NOT NULL DEFAULT '17:00',
  timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- Monday=1, Sunday=7
  focus_blocks JSONB DEFAULT '[]', -- [{"start": "14:00", "end": "16:00", "days": [1,3,5]}]
  auto_schedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  max_tasks_per_day INTEGER NOT NULL DEFAULT 8,
  break_between_tasks_minutes INTEGER NOT NULL DEFAULT 15,
  morning_digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  morning_digest_time TIME NOT NULL DEFAULT '08:00',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pilot_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_scheduled INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_snoozed INTEGER NOT NULL DEFAULT 0,
  avg_completion_time_minutes NUMERIC,
  focus_time_minutes INTEGER NOT NULL DEFAULT 0,
  interruptions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pilot_tasks_user_status ON pilot_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pilot_tasks_scheduled ON pilot_tasks(scheduled_start) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_pilot_tasks_priority ON pilot_tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_metrics_user_date ON pilot_metrics(user_id, date DESC);

-- Enable RLS
ALTER TABLE pilot_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pilot tasks"
  ON pilot_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pilot tasks"
  ON pilot_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pilot tasks"
  ON pilot_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pilot tasks"
  ON pilot_tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own pilot preferences"
  ON pilot_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pilot preferences"
  ON pilot_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pilot preferences"
  ON pilot_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own pilot metrics"
  ON pilot_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pilot metrics"
  ON pilot_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pilot metrics"
  ON pilot_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pilot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pilot_tasks_updated_at
  BEFORE UPDATE ON pilot_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_pilot_updated_at();

CREATE TRIGGER update_pilot_preferences_updated_at
  BEFORE UPDATE ON pilot_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_pilot_updated_at();