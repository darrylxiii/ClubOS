-- Phase 3: Continuous Intelligence Infrastructure

-- Add hiring_intent_score to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hiring_intent_score DECIMAL(5,2) DEFAULT 0.0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hiring_intent_updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_companies_hiring_intent ON companies(hiring_intent_score DESC);

-- Entity relationships graph
CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  strength DECIMAL(3,2) DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_entity_relationships_source ON entity_relationships(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_target ON entity_relationships(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_type ON entity_relationships(relationship_type);

-- Market intelligence aggregates
CREATE TABLE IF NOT EXISTS market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  time_period TEXT,
  geography TEXT,
  industry TEXT,
  sample_size INTEGER,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_market_intelligence_type ON market_intelligence(metric_type, metric_category);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_time ON market_intelligence(time_period, created_at DESC);

-- Intelligence processing queue
CREATE TABLE IF NOT EXISTS intelligence_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  processing_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_intelligence_queue_status ON intelligence_queue(status, priority DESC, created_at);

-- RLS Policies
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can view entity_relationships"
  ON entity_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admins and strategists can manage entity_relationships"
  ON entity_relationships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Everyone can view market intelligence"
  ON market_intelligence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage market intelligence"
  ON market_intelligence FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins and strategists can view intelligence_queue"
  ON intelligence_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- Triggers for auto-processing
CREATE OR REPLACE FUNCTION queue_embedding_generation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO intelligence_queue (entity_type, entity_id, processing_type, priority)
  VALUES (TG_TABLE_NAME, NEW.id, 'generate_embedding', 7);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION queue_interaction_insights()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO intelligence_queue (entity_type, entity_id, processing_type, priority)
  VALUES ('company_interactions', NEW.id, 'extract_insights', 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION queue_training_data_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('interviewed', 'hired', 'rejected', 'offer') THEN
    INSERT INTO intelligence_queue (entity_type, entity_id, processing_type, priority)
    VALUES ('applications', NEW.id, 'update_training_label', 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_candidate_embedding ON candidate_profiles;
CREATE TRIGGER trigger_candidate_embedding
  AFTER INSERT ON candidate_profiles
  FOR EACH ROW
  WHEN (NEW.profile_embedding IS NULL)
  EXECUTE FUNCTION queue_embedding_generation();

DROP TRIGGER IF EXISTS trigger_job_embedding ON jobs;
CREATE TRIGGER trigger_job_embedding
  AFTER INSERT ON jobs
  FOR EACH ROW
  WHEN (NEW.job_embedding IS NULL)
  EXECUTE FUNCTION queue_embedding_generation();

DROP TRIGGER IF EXISTS trigger_interaction_insights ON company_interactions;
CREATE TRIGGER trigger_interaction_insights
  AFTER INSERT ON company_interactions
  FOR EACH ROW
  EXECUTE FUNCTION queue_interaction_insights();

DROP TRIGGER IF EXISTS trigger_application_training ON applications;
CREATE TRIGGER trigger_application_training
  AFTER UPDATE ON applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION queue_training_data_update();