-- AGENTIC OS: CORE TABLES WITH IF NOT EXISTS

-- Agent working memory
CREATE TABLE IF NOT EXISTS agent_working_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'quin',
  context_type TEXT NOT NULL,
  content JSONB NOT NULL,
  priority INTEGER DEFAULT 5,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent learned preferences
CREATE TABLE IF NOT EXISTS agent_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  preference_category TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,
  learned_from TEXT[],
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_category, preference_key)
);

-- Agent registry
CREATE TABLE IF NOT EXISTS agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] NOT NULL,
  autonomy_level TEXT DEFAULT 'semi',
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent delegations
CREATE TABLE IF NOT EXISTS agent_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_agent TEXT NOT NULL,
  child_agent TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  task_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  delegated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Agent goals
CREATE TABLE IF NOT EXISTS agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  target_entity_type TEXT,
  target_entity_id UUID,
  success_criteria JSONB DEFAULT '{}',
  current_progress FLOAT DEFAULT 0,
  status TEXT DEFAULT 'active',
  priority INTEGER DEFAULT 5,
  deadline TIMESTAMPTZ,
  assigned_agents TEXT[] DEFAULT ARRAY['quin'],
  execution_plan JSONB,
  next_action_at TIMESTAMPTZ,
  next_action_description TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal progress history
CREATE TABLE IF NOT EXISTS agent_goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE,
  action_taken TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  outcome TEXT,
  progress_delta FLOAT DEFAULT 0,
  learnings JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent events
CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_data JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  processed_by TEXT[],
  processing_results JSONB,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent autonomy settings
CREATE TABLE IF NOT EXISTS agent_autonomy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID,
  action_type TEXT NOT NULL,
  autonomy_level TEXT DEFAULT 'suggest',
  conditions JSONB DEFAULT '{}',
  notification_preference TEXT DEFAULT 'summary',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action_type)
);

-- Agent action outcomes
CREATE TABLE IF NOT EXISTS agent_action_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_log_id UUID,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  expected_outcome JSONB,
  actual_outcome JSONB,
  outcome_quality FLOAT,
  time_to_outcome INTERVAL,
  context_at_action JSONB,
  learnings_extracted JSONB,
  was_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent behavior rules
CREATE TABLE IF NOT EXISTS agent_behavior_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_description TEXT,
  condition JSONB DEFAULT '{}',
  action_modifier JSONB DEFAULT '{}',
  confidence_score FLOAT DEFAULT 0.5,
  learned_from_count INTEGER DEFAULT 0,
  positive_outcomes INTEGER DEFAULT 0,
  negative_outcomes INTEGER DEFAULT 0,
  last_validated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent experiments
CREATE TABLE IF NOT EXISTS agent_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  control_strategy JSONB DEFAULT '{}',
  variant_strategies JSONB[],
  success_metric TEXT NOT NULL,
  sample_size_target INTEGER DEFAULT 100,
  current_sample_size INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  results JSONB,
  winner_strategy JSONB,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal patterns (predictive_signals already exists)
CREATE TABLE IF NOT EXISTS signal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  detection_rules JSONB DEFAULT '{}',
  historical_accuracy FLOAT DEFAULT 0.5,
  sample_size INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent decision log
CREATE TABLE IF NOT EXISTS agent_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL,
  decision_made TEXT NOT NULL,
  reasoning JSONB DEFAULT '{}',
  alternatives_considered JSONB,
  confidence_score FLOAT,
  context_used JSONB,
  affected_entities JSONB,
  human_can_override BOOLEAN DEFAULT TRUE,
  was_overridden BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  overridden_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agent_working_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_autonomy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_action_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_behavior_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decision_log ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_working_memory_user ON agent_working_memory(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_agent_goals_user_status ON agent_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_events_unprocessed ON agent_events(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_agent_decision_log_user ON agent_decision_log(user_id, created_at DESC);

-- Seed agents
INSERT INTO agent_registry (agent_name, display_name, description, capabilities, autonomy_level, system_prompt) VALUES
  ('quin', 'QUIN', 'Central orchestrator and conversational AI', ARRAY['chat', 'delegate', 'plan', 'coordinate', 'analyze', 'recommend'], 'full', 'You are QUIN, the intelligent assistant for The Quantum Club.'),
  ('sourcing_agent', 'Sourcing Agent', 'Finds and enriches candidate profiles', ARRAY['search_candidates', 'enrich_profiles', 'match_to_jobs'], 'semi', 'You specialize in finding and qualifying candidates.'),
  ('engagement_agent', 'Engagement Agent', 'Manages communication and follow-ups', ARRAY['draft_messages', 'schedule_followups', 'analyze_sentiment'], 'semi', 'You manage communications with precision.'),
  ('interview_agent', 'Interview Agent', 'Prepares briefings and analyzes feedback', ARRAY['generate_questions', 'research_company', 'analyze_interview'], 'reactive', 'You prepare interview materials and analyze outcomes.'),
  ('analytics_agent', 'Analytics Agent', 'Generates insights and detects anomalies', ARRAY['generate_reports', 'detect_anomalies', 'forecast'], 'full', 'You analyze data to surface insights.'),
  ('partner_agent', 'Partner Agent', 'Manages client relationships', ARRAY['analyze_pipeline', 'surface_opportunities', 'track_health'], 'semi', 'You help maintain strong client relationships.')
ON CONFLICT (agent_name) DO NOTHING;