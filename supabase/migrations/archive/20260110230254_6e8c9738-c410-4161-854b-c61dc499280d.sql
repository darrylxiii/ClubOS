
-- =====================================================
-- WORLD'S BEST RAG SYSTEM: Advanced Feature Tables
-- =====================================================

-- 1. User Search Preferences (Adaptive Weighting)
CREATE TABLE IF NOT EXISTS public.user_search_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  semantic_weight DECIMAL(5,4) DEFAULT 0.6,
  keyword_weight DECIMAL(5,4) DEFAULT 0.4,
  recency_weight DECIMAL(5,4) DEFAULT 0.2,
  successful_searches INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  preferred_chunk_size INTEGER DEFAULT 512,
  context_window_preference DECIMAL(3,2) DEFAULT 0.70,
  last_calibrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. RAG Feedback (Active Learning)
CREATE TABLE IF NOT EXISTS public.rag_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL,
  user_id UUID,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'rating', 'comment', 'click', 'dwell')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  result_id UUID,
  result_rank INTEGER,
  original_score DECIMAL(5,4),
  rerank_score DECIMAL(5,4),
  was_clicked BOOLEAN DEFAULT FALSE,
  dwell_time_ms INTEGER,
  context_used JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Query Intent Classification Cache
CREATE TABLE IF NOT EXISTS public.query_intent_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  intent_type TEXT NOT NULL CHECK (intent_type IN ('informational', 'navigational', 'transactional', 'comparison', 'entity_lookup')),
  confidence DECIMAL(5,4) NOT NULL,
  sub_intents JSONB DEFAULT '[]',
  entities_detected JSONB DEFAULT '[]',
  specialized_retriever TEXT,
  cache_hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- 4. Embedding Cache (Smart Caching)
CREATE TABLE IF NOT EXISTS public.embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  embedding vector(1536),
  results_json JSONB,
  search_params JSONB DEFAULT '{}',
  hit_count INTEGER DEFAULT 1,
  last_hit_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

-- 5. Prompt Experiments (Auto-Prompt Optimization)
CREATE TABLE IF NOT EXISTS public.prompt_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name TEXT NOT NULL,
  prompt_variant TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_control BOOLEAN DEFAULT FALSE,
  traffic_percentage DECIMAL(5,4) DEFAULT 0.1,
  total_impressions INTEGER DEFAULT 0,
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  avg_response_quality DECIMAL(5,4),
  avg_latency_ms INTEGER,
  statistical_significance DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Entity Graph Links
CREATE TABLE IF NOT EXISTS public.entity_graph_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  relationship_strength DECIMAL(5,4) DEFAULT 0.5,
  bidirectional BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_entity_type, source_entity_id, target_entity_type, target_entity_id, relationship_type)
);

-- 7. Hallucination Detection Log
CREATE TABLE IF NOT EXISTS public.hallucination_detection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL,
  conversation_id UUID,
  user_id UUID,
  response_text TEXT NOT NULL,
  source_chunks JSONB NOT NULL,
  claims_extracted JSONB NOT NULL,
  verified_claims INTEGER DEFAULT 0,
  unverified_claims INTEGER DEFAULT 0,
  hallucination_score DECIMAL(5,4),
  flagged_segments JSONB DEFAULT '[]',
  was_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  review_outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_search_preferences_user ON user_search_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_feedback_query ON rag_feedback(query_id);
CREATE INDEX IF NOT EXISTS idx_rag_feedback_user ON rag_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_feedback_type ON rag_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_query_intent_cache_hash ON query_intent_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_intent_cache_expires ON query_intent_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires ON embedding_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_prompt_experiments_active ON prompt_experiments(is_active, experiment_name);
CREATE INDEX IF NOT EXISTS idx_entity_graph_source ON entity_graph_links(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_graph_target ON entity_graph_links(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_hallucination_log_query ON hallucination_detection_log(query_id);
CREATE INDEX IF NOT EXISTS idx_hallucination_log_score ON hallucination_detection_log(hallucination_score) WHERE hallucination_score > 0.3;

-- Vector index for semantic cache
CREATE INDEX IF NOT EXISTS idx_embedding_cache_vector ON embedding_cache 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_search_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_intent_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_graph_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE hallucination_detection_log ENABLE ROW LEVEL SECURITY;

-- User Search Preferences: Users can only access their own
CREATE POLICY "Users manage own search preferences" ON user_search_preferences
  FOR ALL USING (auth.uid() = user_id);

-- RAG Feedback: Users can create their own feedback
CREATE POLICY "Users create own feedback" ON rag_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own feedback" ON rag_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Query Intent Cache: Service role only (system cache)
CREATE POLICY "Service role manages intent cache" ON query_intent_cache
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Embedding Cache: Service role only (system cache)
CREATE POLICY "Service role manages embedding cache" ON embedding_cache
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Prompt Experiments: Service role manages, authenticated users read
CREATE POLICY "Service role manages experiments" ON prompt_experiments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Authenticated users read experiments" ON prompt_experiments
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- Entity Graph: Authenticated users can read
CREATE POLICY "Authenticated users read entity graph" ON entity_graph_links
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role manages entity graph" ON entity_graph_links
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Hallucination Log: Users can view their own, service role manages all
CREATE POLICY "Users view own hallucination logs" ON hallucination_detection_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages hallucination logs" ON hallucination_detection_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update user search weights based on feedback
CREATE OR REPLACE FUNCTION update_user_search_weights()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process thumbs_up or thumbs_down feedback
  IF NEW.feedback_type IN ('thumbs_up', 'thumbs_down') THEN
    INSERT INTO user_search_preferences (user_id, successful_searches, total_searches)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.feedback_type = 'thumbs_up' THEN 1 ELSE 0 END,
      1
    )
    ON CONFLICT (user_id) DO UPDATE SET
      successful_searches = user_search_preferences.successful_searches + 
        CASE WHEN NEW.feedback_type = 'thumbs_up' THEN 1 ELSE 0 END,
      total_searches = user_search_preferences.total_searches + 1,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update weights on feedback
DROP TRIGGER IF EXISTS trigger_update_search_weights ON rag_feedback;
CREATE TRIGGER trigger_update_search_weights
  AFTER INSERT ON rag_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_user_search_weights();

-- Function to clean expired caches
CREATE OR REPLACE FUNCTION clean_expired_caches()
RETURNS void AS $$
BEGIN
  DELETE FROM query_intent_cache WHERE expires_at < now();
  DELETE FROM embedding_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
