-- RAG Evaluation Metrics Table for 2025 RAG Architecture
-- Tracks Precision@5, Recall@5, F1@5, Answer Relevancy, Faithfulness, Contextual Relevancy

CREATE TABLE IF NOT EXISTS public.rag_evaluation_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  
  -- Query details
  original_query TEXT NOT NULL,
  query_variations TEXT[] DEFAULT '{}',
  
  -- Retrieval metrics
  total_candidates_retrieved INTEGER DEFAULT 0,
  candidates_after_rerank INTEGER DEFAULT 0,
  precision_at_5 DECIMAL(5,4),
  recall_at_5 DECIMAL(5,4),
  f1_at_5 DECIMAL(5,4),
  mean_reciprocal_rank DECIMAL(5,4),
  
  -- Answer quality metrics (0-1 scale)
  answer_relevancy DECIMAL(5,4),
  faithfulness DECIMAL(5,4),
  contextual_relevancy DECIMAL(5,4),
  groundedness DECIMAL(5,4),
  
  -- Performance metrics
  retrieval_time_ms INTEGER,
  rerank_time_ms INTEGER,
  generation_time_ms INTEGER,
  total_time_ms INTEGER,
  
  -- Context utilization
  context_tokens_used INTEGER,
  max_context_tokens INTEGER,
  context_utilization DECIMAL(5,4),
  
  -- Chunk details
  chunk_ids UUID[] DEFAULT '{}',
  chunk_scores DECIMAL[] DEFAULT '{}',
  
  -- Reranking details
  rerank_model TEXT,
  original_ranks INTEGER[] DEFAULT '{}',
  final_ranks INTEGER[] DEFAULT '{}',
  
  -- RRF fusion details
  rrf_scores DECIMAL[] DEFAULT '{}',
  query_coverage DECIMAL(5,4),
  
  -- Feedback
  user_feedback TEXT,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_helpful BOOLEAN,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rag_evaluation_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own RAG metrics"
  ON public.rag_evaluation_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert RAG metrics"
  ON public.rag_evaluation_metrics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own metrics feedback"
  ON public.rag_evaluation_metrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all RAG metrics"
  ON public.rag_evaluation_metrics
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Indexes for analytics
CREATE INDEX idx_rag_metrics_user ON public.rag_evaluation_metrics(user_id);
CREATE INDEX idx_rag_metrics_conversation ON public.rag_evaluation_metrics(conversation_id);
CREATE INDEX idx_rag_metrics_created ON public.rag_evaluation_metrics(created_at DESC);
CREATE INDEX idx_rag_metrics_precision ON public.rag_evaluation_metrics(precision_at_5 DESC);
CREATE INDEX idx_rag_metrics_relevancy ON public.rag_evaluation_metrics(answer_relevancy DESC);

-- Aggregated metrics view for dashboards
CREATE OR REPLACE VIEW public.rag_metrics_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as total_queries,
  AVG(precision_at_5) as avg_precision,
  AVG(recall_at_5) as avg_recall,
  AVG(f1_at_5) as avg_f1,
  AVG(answer_relevancy) as avg_answer_relevancy,
  AVG(faithfulness) as avg_faithfulness,
  AVG(contextual_relevancy) as avg_contextual_relevancy,
  AVG(context_utilization) as avg_context_utilization,
  AVG(total_time_ms) as avg_latency_ms,
  COUNT(*) FILTER (WHERE was_helpful = true) as helpful_count,
  COUNT(*) FILTER (WHERE was_helpful = false) as not_helpful_count
FROM public.rag_evaluation_metrics
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- Trigger for updated_at
CREATE TRIGGER update_rag_evaluation_metrics_updated_at
  BEFORE UPDATE ON public.rag_evaluation_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();