-- ============================================
-- ML System Tables (Phase A)
-- Creates core ML infrastructure WITHOUT ml_training_data
-- Training data now comes from real-time interactions, not historical backfill
-- ============================================

-- ML Models Table: Track model versions and performance
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  model_type TEXT NOT NULL CHECK (model_type IN ('xgboost', 'lightgbm', 'neural_net', 'ensemble', 'baseline')),
  model_storage_path TEXT,
  training_config JSONB,
  metrics JSONB NOT NULL DEFAULT '{}',
  feature_importance JSONB,
  training_data_count INTEGER,
  training_start_time TIMESTAMPTZ,
  training_end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'testing', 'active', 'retired', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ml_models_version ON public.ml_models(version);
CREATE INDEX idx_ml_models_status ON public.ml_models(status);

-- ML Predictions Table: Store match predictions for candidate-job pairs
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version INTEGER NOT NULL REFERENCES public.ml_models(version) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  prediction_score DECIMAL(5,4) NOT NULL CHECK (prediction_score >= 0 AND prediction_score <= 1),
  interview_probability DECIMAL(5,4),
  predicted_time_to_hire_days INTEGER,
  rank_position INTEGER,
  features_used JSONB,
  shap_values JSONB,
  ab_test_id UUID,
  ab_test_variant TEXT CHECK (ab_test_variant IN ('model_a', 'model_b', 'control')),
  actual_outcome TEXT CHECK (actual_outcome IN ('hired', 'interviewed', 'rejected', 'pending')),
  actual_outcome_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ml_predictions_candidate ON public.ml_predictions(candidate_id);
CREATE INDEX idx_ml_predictions_job ON public.ml_predictions(job_id);
CREATE INDEX idx_ml_predictions_model ON public.ml_predictions(model_version);
CREATE INDEX idx_ml_predictions_score ON public.ml_predictions(prediction_score DESC);

-- ML A/B Tests Table: Track model comparison experiments
CREATE TABLE IF NOT EXISTS public.ml_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  model_a_version INTEGER NOT NULL REFERENCES public.ml_models(version),
  model_b_version INTEGER NOT NULL REFERENCES public.ml_models(version),
  traffic_split DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (traffic_split >= 0 AND traffic_split <= 1),
  target_metric TEXT NOT NULL,
  hypothesis TEXT,
  metrics_a JSONB,
  metrics_b JSONB,
  statistical_significance DECIMAL(5,4),
  winner TEXT CHECK (winner IN ('model_a', 'model_b', 'no_difference', 'pending')),
  sample_size_a INTEGER NOT NULL DEFAULT 0,
  sample_size_b INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'stopped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_ml_ab_tests_status ON public.ml_ab_tests(status);

-- ML Model Metrics Table: Track performance over time
CREATE TABLE IF NOT EXISTS public.ml_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version INTEGER NOT NULL REFERENCES public.ml_models(version) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,6) NOT NULL,
  sample_size INTEGER,
  confidence_interval_lower DECIMAL(10,6),
  confidence_interval_upper DECIMAL(10,6),
  segment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ml_model_metrics_version ON public.ml_model_metrics(model_version);
CREATE INDEX idx_ml_model_metrics_date ON public.ml_model_metrics(metric_date DESC);
CREATE UNIQUE INDEX idx_ml_model_metrics_unique ON public.ml_model_metrics(model_version, metric_date, metric_name, COALESCE(segment, ''));

-- ML Feedback Table: Capture user feedback on predictions
CREATE TABLE IF NOT EXISTS public.ml_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.ml_predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('candidate', 'strategist', 'partner')),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('boost', 'block', 'great_match', 'not_relevant', 'wrong_skills', 'wrong_culture', 'wrong_salary')),
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  feedback_text TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ml_feedback_prediction ON public.ml_feedback(prediction_id);
CREATE INDEX idx_ml_feedback_user ON public.ml_feedback(user_id);

-- ============================================
-- RLS Policies
-- ============================================

-- ML Models: Admin-only access
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all models"
  ON public.ml_models FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage models"
  ON public.ml_models FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ML Predictions: Admins + Strategists can view
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can view predictions"
  ON public.ml_predictions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'strategist')
  );

CREATE POLICY "Admins can manage predictions"
  ON public.ml_predictions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ML A/B Tests: Admin-only
ALTER TABLE public.ml_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AB tests"
  ON public.ml_ab_tests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage AB tests"
  ON public.ml_ab_tests FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ML Model Metrics: Admin-only
ALTER TABLE public.ml_model_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view metrics"
  ON public.ml_model_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage metrics"
  ON public.ml_model_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ML Feedback: Users can create, admins can view all
ALTER TABLE public.ml_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback"
  ON public.ml_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their feedback"
  ON public.ml_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.ml_feedback FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE TRIGGER update_ml_models_updated_at
  BEFORE UPDATE ON public.ml_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE public.ml_models IS 'Stores ML model versions and performance metrics';
COMMENT ON TABLE public.ml_predictions IS 'Stores candidate-job match predictions from ML models';
COMMENT ON TABLE public.ml_ab_tests IS 'Tracks A/B tests comparing model performance';
COMMENT ON TABLE public.ml_model_metrics IS 'Time-series metrics for model performance monitoring';
COMMENT ON TABLE public.ml_feedback IS 'User feedback on ML predictions for continuous improvement';

COMMENT ON COLUMN public.ml_predictions.prediction_score IS 'Probability of hire (0-1)';
COMMENT ON COLUMN public.ml_predictions.shap_values IS 'SHAP values explaining prediction factors';
COMMENT ON COLUMN public.ml_feedback.feedback_type IS 'Categorized feedback for model training';