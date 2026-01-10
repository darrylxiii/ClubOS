-- Drop conflicting index if exists and recreate tables properly
-- First, check and drop any conflicting objects

-- 1. ADVERSARIAL ROBUSTNESS: Prompt injection detection
CREATE TABLE IF NOT EXISTS public.adversarial_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  query_text TEXT NOT NULL,
  detected_patterns TEXT[] NOT NULL DEFAULT '{}',
  threat_level TEXT NOT NULL CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
  blocked BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MULTI-MODAL RAG: Document embeddings
CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('pdf', 'image', 'video', 'audio', 'contract', 'presentation')),
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content_text TEXT,
  ocr_text TEXT,
  transcript_text TEXT,
  embedding vector(1536),
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  page_number INTEGER,
  timestamp_start DECIMAL,
  timestamp_end DECIMAL,
  confidence_score DECIMAL(5,4),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. KNOWLEDGE GRAPH AUTO-GENERATION: Entity relationships with NER
-- Using a different name to avoid conflict with any existing table
CREATE TABLE IF NOT EXISTS public.ner_entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id UUID NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_name TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_name TEXT NOT NULL,
  confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  extraction_source TEXT NOT NULL CHECK (extraction_source IN ('ner', 'manual', 'inference', 'user_feedback')),
  evidence_text TEXT,
  evidence_source_id UUID,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CONTEXTUAL COMPRESSION
CREATE TABLE IF NOT EXISTS public.compression_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name TEXT NOT NULL,
  original_context TEXT NOT NULL,
  compressed_context TEXT NOT NULL,
  compression_ratio DECIMAL(5,4) NOT NULL,
  compression_model TEXT NOT NULL,
  key_facts_preserved INTEGER,
  key_facts_total INTEGER,
  token_count_original INTEGER NOT NULL,
  token_count_compressed INTEGER NOT NULL,
  cost_savings_usd DECIMAL(10,6),
  quality_score DECIMAL(5,4),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  response_quality_before DECIMAL(5,4),
  response_quality_after DECIMAL(5,4),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COLLABORATIVE FILTERING: User similarity matrix
CREATE TABLE IF NOT EXISTS public.user_similarity_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id),
  user_b_id UUID NOT NULL REFERENCES auth.users(id),
  similarity_score DECIMAL(5,4) NOT NULL,
  similarity_factors JSONB NOT NULL DEFAULT '{}',
  role_similarity DECIMAL(5,4),
  query_pattern_similarity DECIMAL(5,4),
  industry_similarity DECIMAL(5,4),
  seniority_similarity DECIMAL(5,4),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sample_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_a_id, user_b_id)
);

-- Query success patterns
CREATE TABLE IF NOT EXISTS public.query_success_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  query_intent TEXT,
  successful_result_ids UUID[] NOT NULL DEFAULT '{}',
  click_through_rate DECIMAL(5,4),
  time_to_success_ms INTEGER,
  user_satisfaction_score INTEGER CHECK (user_satisfaction_score BETWEEN 1 AND 5),
  result_used BOOLEAN DEFAULT false,
  conversion_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RAG EXPLAINABILITY: Retrieval attribution
CREATE TABLE IF NOT EXISTS public.retrieval_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL,
  response_id UUID,
  chunk_id UUID NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_source_type TEXT NOT NULL,
  chunk_source_id UUID,
  contribution_score DECIMAL(5,4) NOT NULL,
  relevance_score DECIMAL(5,4) NOT NULL,
  position_in_context INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL,
  was_cited_in_response BOOLEAN DEFAULT false,
  citation_text TEXT,
  user_verified_helpful BOOLEAN,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. CONTINUOUS EVALUATION: Quality benchmarks
CREATE TABLE IF NOT EXISTS public.rag_quality_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_date DATE NOT NULL DEFAULT CURRENT_DATE,
  benchmark_type TEXT NOT NULL CHECK (benchmark_type IN ('daily', 'weekly', 'monthly', 'synthetic', 'production')),
  total_queries_evaluated INTEGER NOT NULL DEFAULT 0,
  avg_precision_at_5 DECIMAL(5,4),
  avg_recall_at_5 DECIMAL(5,4),
  avg_ndcg DECIMAL(5,4),
  avg_mrr DECIMAL(5,4),
  avg_latency_ms DECIMAL(10,2),
  p50_latency_ms DECIMAL(10,2),
  p95_latency_ms DECIMAL(10,2),
  p99_latency_ms DECIMAL(10,2),
  hallucination_rate DECIMAL(5,4),
  factual_accuracy DECIMAL(5,4),
  context_utilization DECIMAL(5,4),
  cache_hit_rate DECIMAL(5,4),
  token_efficiency DECIMAL(5,4),
  user_satisfaction_avg DECIMAL(5,4),
  quality_score DECIMAL(5,4),
  quality_delta_from_previous DECIMAL(5,4),
  alert_triggered BOOLEAN DEFAULT false,
  alert_reasons TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(benchmark_date, benchmark_type)
);

-- Synthetic test queries
CREATE TABLE IF NOT EXISTS public.synthetic_test_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  expected_intent TEXT,
  expected_entities JSONB,
  expected_result_ids UUID[],
  ground_truth_answer TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'adversarial')),
  category TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_evaluated_at TIMESTAMPTZ,
  last_score DECIMAL(5,4),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. FEDERATED RAG: Secure enclave queries
CREATE TABLE IF NOT EXISTS public.secure_enclave_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  query_hash TEXT NOT NULL,
  query_intent TEXT,
  data_classification TEXT NOT NULL CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted', 'pii', 'phi', 'pci')),
  enclave_location TEXT NOT NULL CHECK (enclave_location IN ('cloud', 'on_premise', 'hybrid', 'air_gapped')),
  processing_location TEXT NOT NULL,
  data_never_left_enclave BOOLEAN NOT NULL DEFAULT true,
  encryption_method TEXT,
  audit_trail_hash TEXT,
  compliance_frameworks TEXT[] DEFAULT '{}',
  response_hash TEXT,
  latency_ms INTEGER,
  approved_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. RAG-AS-A-SERVICE: API usage and billing
CREATE TABLE IF NOT EXISTS public.rag_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_id UUID NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
  cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  error_code TEXT,
  rate_limit_remaining INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  model_used TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API keys management
CREATE TABLE IF NOT EXISTS public.rag_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{read}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
  monthly_token_limit INTEGER,
  tokens_used_this_month INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. COMPETITIVE INTELLIGENCE: Comparison logs
CREATE TABLE IF NOT EXISTS public.competitor_comparison_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  query_category TEXT,
  our_response TEXT NOT NULL,
  our_latency_ms INTEGER NOT NULL,
  our_token_count INTEGER,
  our_cost_usd DECIMAL(10,6),
  our_quality_score DECIMAL(5,4),
  our_hallucination_detected BOOLEAN,
  competitor_name TEXT NOT NULL CHECK (competitor_name IN ('openai', 'anthropic', 'google', 'cohere', 'aws_bedrock')),
  competitor_response TEXT,
  competitor_latency_ms INTEGER,
  competitor_token_count INTEGER,
  competitor_cost_usd DECIMAL(10,6),
  competitor_quality_score DECIMAL(5,4),
  winner TEXT CHECK (winner IN ('ours', 'competitor', 'tie')),
  win_margin DECIMAL(5,4),
  evaluation_method TEXT CHECK (evaluation_method IN ('auto', 'human', 'llm_judge', 'metrics')),
  evaluated_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE adversarial_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ner_entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE compression_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_similarity_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_success_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_quality_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_test_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_enclave_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_comparison_log ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins full access adversarial" ON adversarial_query_log FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access doc_embeddings" ON document_embeddings FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access ner_relationships" ON ner_entity_relationships FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access compression" ON compression_experiments FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users view similarity" ON user_similarity_matrix FOR SELECT 
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users manage query patterns" ON query_success_patterns FOR ALL 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access attribution" ON retrieval_attribution FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access benchmarks" ON rag_quality_benchmarks FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access synthetic" ON synthetic_test_queries FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access enclave" ON secure_enclave_queries FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins view api_usage" ON rag_api_usage FOR SELECT 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage api_keys" ON rag_api_keys FOR ALL 
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access competitor" ON competitor_comparison_log FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));