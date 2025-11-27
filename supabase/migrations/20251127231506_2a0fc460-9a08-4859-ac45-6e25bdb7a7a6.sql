-- Phase 2: Complete ML Training Infrastructure

-- Create ml_models table if not exists
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  model_type TEXT NOT NULL CHECK (model_type IN ('xgboost', 'lightgbm', 'neural_net', 'ensemble', 'baseline')),
  model_storage_path TEXT,
  model_weights JSONB,
  training_config JSONB,
  metrics JSONB,
  feature_importance JSONB,
  training_data_count INTEGER,
  training_start_time TIMESTAMPTZ,
  training_end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'training' CHECK (status IN ('training', 'testing', 'active', 'retired', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ml_predictions table if not exists
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version INTEGER NOT NULL,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  prediction_score DECIMAL(5,4) NOT NULL,
  interview_probability DECIMAL(5,4),
  predicted_time_to_hire_days INTEGER,
  rank_position INTEGER,
  features_used JSONB,
  shap_values JSONB,
  ab_test_id UUID,
  ab_test_variant TEXT CHECK (ab_test_variant IN ('model_a', 'model_b', 'control')),
  actual_outcome TEXT CHECK (actual_outcome IN ('hired', 'interviewed', 'rejected', 'pending')),
  actual_outcome_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ml_training_data table
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  job_id UUID NOT NULL,
  application_id UUID,
  company_id UUID,
  features JSONB NOT NULL,
  semantic_similarity_score DECIMAL(5,4),
  label_hired BOOLEAN NOT NULL DEFAULT false,
  label_interviewed BOOLEAN NOT NULL DEFAULT false,
  label_rejected BOOLEAN NOT NULL DEFAULT false,
  time_to_hire_days INTEGER,
  time_to_interview_days INTEGER,
  rejection_stage TEXT,
  match_score_at_time DECIMAL(5,4),
  strategist_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ml_training_runs table
CREATE TABLE IF NOT EXISTS ml_training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version INTEGER NOT NULL,
  training_start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  training_end_time TIMESTAMPTZ,
  training_samples_count INTEGER,
  validation_samples_count INTEGER,
  hyperparameters JSONB,
  metrics JSONB,
  feature_importance JSONB,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ml_ab_tests table if not exists
CREATE TABLE IF NOT EXISTS ml_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  model_a_version INTEGER NOT NULL,
  model_b_version INTEGER NOT NULL,
  traffic_split DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  target_metric TEXT NOT NULL,
  hypothesis TEXT,
  metrics_a JSONB,
  metrics_b JSONB,
  statistical_significance DECIMAL(5,4),
  winner TEXT CHECK (winner IN ('model_a', 'model_b', 'no_difference', 'pending')),
  sample_size_a INTEGER DEFAULT 0,
  sample_size_b INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'stopped')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Create ml_feedback table if not exists
CREATE TABLE IF NOT EXISTS ml_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES ml_predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('candidate', 'strategist', 'partner')),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('boost', 'block', 'great_match', 'not_relevant', 'wrong_skills', 'wrong_culture', 'wrong_salary')),
  feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_text TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_version ON ml_models(version);
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_candidate ON ml_predictions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_job ON ml_predictions(job_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_version ON ml_predictions(model_version);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_outcome ON ml_predictions(actual_outcome);
CREATE INDEX IF NOT EXISTS idx_ml_training_data_candidate ON ml_training_data(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_data_job ON ml_training_data(job_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_data_labels ON ml_training_data(label_hired, label_interviewed, label_rejected);
CREATE INDEX IF NOT EXISTS idx_ml_training_runs_version ON ml_training_runs(model_version);
CREATE INDEX IF NOT EXISTS idx_ml_training_runs_status ON ml_training_runs(status);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_prediction ON ml_feedback(prediction_id);

-- Create function to get training data
CREATE OR REPLACE FUNCTION get_ml_training_data(
  limit_count INTEGER DEFAULT 1000,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  training_id UUID,
  candidate_id UUID,
  job_id UUID,
  features JSONB,
  semantic_similarity_score DECIMAL,
  label_hired BOOLEAN,
  label_interviewed BOOLEAN,
  label_rejected BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.id as training_id,
    td.candidate_id,
    td.job_id,
    td.features,
    td.semantic_similarity_score,
    td.label_hired,
    td.label_interviewed,
    td.label_rejected
  FROM ml_training_data td
  WHERE td.features IS NOT NULL
    AND (td.label_hired = true OR td.label_interviewed = true OR td.label_rejected = true)
  ORDER BY td.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

COMMENT ON TABLE ml_models IS 'Stores trained ML model configurations and weights';
COMMENT ON TABLE ml_predictions IS 'Stores ML model predictions for candidate-job matches';
COMMENT ON TABLE ml_training_data IS 'Historical training data for ML models';
COMMENT ON TABLE ml_training_runs IS 'Tracks ML model training history and performance';
COMMENT ON TABLE ml_ab_tests IS 'A/B test configurations for comparing model versions';
COMMENT ON TABLE ml_feedback IS 'User feedback on ML predictions for model improvement';