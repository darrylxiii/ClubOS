-- Unified Communication Intelligence System Database Foundation

-- Create entity type enum
CREATE TYPE communication_entity_type AS ENUM ('candidate', 'prospect', 'partner', 'company', 'stakeholder');

-- Create communication channel enum
CREATE TYPE communication_channel AS ENUM ('whatsapp', 'email', 'meeting', 'phone', 'linkedin', 'in_person', 'other');

-- Create pattern type enum
CREATE TYPE communication_pattern_type AS ENUM (
  'going_cold', 
  'highly_engaged', 
  'channel_preference', 
  'response_time_change',
  'sentiment_shift',
  'objection_raising',
  'ready_to_convert',
  'needs_escalation',
  'ghosting',
  're_engaged'
);

-- Create risk level enum
CREATE TYPE relationship_risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create workflow trigger type enum
CREATE TYPE workflow_trigger_type AS ENUM (
  'message_received',
  'no_response',
  'sentiment_change',
  'pattern_detected',
  'meeting_completed',
  'stage_change',
  'manual'
);

-- Create workflow action type enum
CREATE TYPE workflow_action_type AS ENUM (
  'send_whatsapp',
  'send_email',
  'create_task',
  'assign_strategist',
  'update_stage',
  'schedule_meeting',
  'alert_admin',
  'add_tag',
  'webhook'
);

-- 1. Unified Communications Table - Master table linking all communications
CREATE TABLE unified_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type communication_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  channel communication_channel NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'mutual')),
  sender_id UUID,
  recipient_id UUID,
  subject TEXT,
  content_preview TEXT,
  content_summary TEXT,
  sentiment_score NUMERIC(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  intent TEXT,
  intent_confidence NUMERIC(3,2),
  key_topics TEXT[],
  mentioned_entities JSONB DEFAULT '[]',
  ai_analysis JSONB,
  response_time_seconds INTEGER,
  is_first_contact BOOLEAN DEFAULT false,
  has_attachment BOOLEAN DEFAULT false,
  original_timestamp TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Communication Relationship Scores Table
CREATE TABLE communication_relationship_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type communication_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  total_communications INTEGER DEFAULT 0,
  inbound_count INTEGER DEFAULT 0,
  outbound_count INTEGER DEFAULT 0,
  engagement_score NUMERIC(5,2) DEFAULT 0,
  response_rate NUMERIC(5,4) DEFAULT 0,
  avg_response_time_hours NUMERIC(8,2),
  avg_sentiment NUMERIC(3,2) DEFAULT 0,
  sentiment_trend TEXT CHECK (sentiment_trend IN ('improving', 'stable', 'declining')),
  preferred_channel communication_channel,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  last_positive_interaction TIMESTAMPTZ,
  last_negative_interaction TIMESTAMPTZ,
  days_since_contact INTEGER,
  risk_level relationship_risk_level DEFAULT 'low',
  risk_factors TEXT[],
  health_score NUMERIC(5,2) DEFAULT 100,
  recommended_action TEXT,
  recommended_channel communication_channel,
  next_best_time TIMESTAMPTZ,
  conversion_probability NUMERIC(5,4),
  key_topics TEXT[],
  relationship_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, owner_id)
);

-- 3. Cross Channel Patterns Table
CREATE TABLE cross_channel_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type communication_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  pattern_type communication_pattern_type NOT NULL,
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  details JSONB,
  evidence JSONB,
  detected_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_action TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Communication Workflows Table
CREATE TABLE communication_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  cooldown_hours INTEGER DEFAULT 24,
  max_executions_per_entity INTEGER,
  target_entity_types communication_entity_type[] DEFAULT '{candidate,prospect}',
  target_channels communication_channel[],
  priority INTEGER DEFAULT 5,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Workflow Executions Table (for tracking)
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES communication_workflows(id) ON DELETE CASCADE,
  entity_type communication_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  trigger_event JSONB,
  actions_executed JSONB DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Communication Intelligence Queue
CREATE TABLE communication_intelligence_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type communication_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  processing_type TEXT NOT NULL,
  source_communication_id UUID REFERENCES unified_communications(id),
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_unified_comms_entity ON unified_communications(entity_type, entity_id);
CREATE INDEX idx_unified_comms_channel ON unified_communications(channel);
CREATE INDEX idx_unified_comms_timestamp ON unified_communications(original_timestamp DESC);
CREATE INDEX idx_unified_comms_sentiment ON unified_communications(sentiment_score);
CREATE INDEX idx_unified_comms_source ON unified_communications(source_table, source_id);

CREATE INDEX idx_relationship_scores_entity ON communication_relationship_scores(entity_type, entity_id);
CREATE INDEX idx_relationship_scores_owner ON communication_relationship_scores(owner_id);
CREATE INDEX idx_relationship_scores_risk ON communication_relationship_scores(risk_level);
CREATE INDEX idx_relationship_scores_health ON communication_relationship_scores(health_score);

CREATE INDEX idx_patterns_entity ON cross_channel_patterns(entity_type, entity_id);
CREATE INDEX idx_patterns_type ON cross_channel_patterns(pattern_type);
CREATE INDEX idx_patterns_active ON cross_channel_patterns(is_active) WHERE is_active = true;

CREATE INDEX idx_workflows_active ON communication_workflows(is_active) WHERE is_active = true;
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_entity ON workflow_executions(entity_type, entity_id);

CREATE INDEX idx_intelligence_queue_pending ON communication_intelligence_queue(status, scheduled_for) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE unified_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_relationship_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_channel_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_intelligence_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and strategists can view all unified communications"
  ON unified_communications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can insert unified communications"
  ON unified_communications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can view relationship scores"
  ON communication_relationship_scores FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can manage relationship scores"
  ON communication_relationship_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can view patterns"
  ON cross_channel_patterns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can manage patterns"
  ON cross_channel_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins can manage workflows"
  ON communication_workflows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Strategists can view workflows"
  ON communication_workflows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can view workflow executions"
  ON workflow_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "System can manage intelligence queue"
  ON communication_intelligence_queue FOR ALL
  TO authenticated
  USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE unified_communications;
ALTER PUBLICATION supabase_realtime ADD TABLE communication_relationship_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE cross_channel_patterns;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_executions;

-- Create function to update relationship scores
CREATE OR REPLACE FUNCTION update_communication_relationship_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_inbound INTEGER;
  v_outbound INTEGER;
  v_avg_sentiment NUMERIC;
  v_last_inbound TIMESTAMPTZ;
  v_last_outbound TIMESTAMPTZ;
BEGIN
  -- Calculate stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE direction = 'inbound'),
    COUNT(*) FILTER (WHERE direction = 'outbound'),
    AVG(sentiment_score),
    MAX(original_timestamp) FILTER (WHERE direction = 'inbound'),
    MAX(original_timestamp) FILTER (WHERE direction = 'outbound')
  INTO v_total, v_inbound, v_outbound, v_avg_sentiment, v_last_inbound, v_last_outbound
  FROM unified_communications
  WHERE entity_type = NEW.entity_type AND entity_id = NEW.entity_id;

  -- Upsert relationship score
  INSERT INTO communication_relationship_scores (
    entity_type, entity_id, total_communications, inbound_count, outbound_count,
    avg_sentiment, last_inbound_at, last_outbound_at, days_since_contact, updated_at
  )
  VALUES (
    NEW.entity_type, NEW.entity_id, v_total, v_inbound, v_outbound,
    COALESCE(v_avg_sentiment, 0), v_last_inbound, v_last_outbound,
    EXTRACT(DAY FROM now() - GREATEST(COALESCE(v_last_inbound, '1970-01-01'), COALESCE(v_last_outbound, '1970-01-01'))),
    now()
  )
  ON CONFLICT (entity_type, entity_id, owner_id) DO UPDATE SET
    total_communications = EXCLUDED.total_communications,
    inbound_count = EXCLUDED.inbound_count,
    outbound_count = EXCLUDED.outbound_count,
    avg_sentiment = EXCLUDED.avg_sentiment,
    last_inbound_at = EXCLUDED.last_inbound_at,
    last_outbound_at = EXCLUDED.last_outbound_at,
    days_since_contact = EXCLUDED.days_since_contact,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_relationship_score
AFTER INSERT ON unified_communications
FOR EACH ROW
EXECUTE FUNCTION update_communication_relationship_score();

-- Create updated_at triggers
CREATE TRIGGER update_unified_communications_updated_at
BEFORE UPDATE ON unified_communications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_relationship_scores_updated_at
BEFORE UPDATE ON communication_relationship_scores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON communication_workflows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Insert default workflows
INSERT INTO communication_workflows (name, description, is_system, trigger_type, trigger_conditions, actions, target_entity_types)
VALUES 
  (
    'Going Cold Alert',
    'Alert when no response received in 48 hours across any channel',
    true,
    'no_response',
    '{"hours_threshold": 48, "channels": ["whatsapp", "email"]}',
    '[{"type": "create_task", "config": {"title": "Follow up - Going Cold", "priority": "high"}}, {"type": "alert_admin", "config": {"message": "Relationship going cold"}}]',
    '{candidate,prospect}'
  ),
  (
    'Hot Lead Fast Track',
    'Create urgent task when high intent detected',
    true,
    'pattern_detected',
    '{"pattern_type": "ready_to_convert", "confidence_threshold": 0.8}',
    '[{"type": "create_task", "config": {"title": "Hot Lead - Act Now", "priority": "urgent"}}, {"type": "assign_strategist", "config": {"senior": true}}]',
    '{candidate,prospect}'
  ),
  (
    'Sentiment Recovery',
    'Escalate when sentiment drops significantly',
    true,
    'sentiment_change',
    '{"sentiment_drop": -0.3, "window_hours": 24}',
    '[{"type": "create_task", "config": {"title": "Sentiment Drop - Review", "priority": "high"}}, {"type": "alert_admin", "config": {}}]',
    '{candidate,prospect}'
  );
