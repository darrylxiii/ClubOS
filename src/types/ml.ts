/**
 * ML System Type Definitions
 * Types for the Machine Learning matching engine
 */

export interface MLFeatures {
  feature_version: number;
  generated_at: string;
  
  // Candidate features
  candidate_total_skills: number;
  candidate_years_experience: number;
  candidate_seniority_level: string;
  candidate_profile_completeness: number;
  candidate_last_active_days_ago: number;
  candidate_interview_rate: number;
  
  // Job features
  job_days_since_posted: number;
  job_application_count: number;
  job_required_skills_count: number;
  
  // Match features
  skills_match_percentage: number;
  experience_years_match: number;
  salary_in_range: number;
  location_remote_compatible: number;
  overall_fit_score: number;
  
  // Semantic similarity
  semantic_similarity_score: number;
  
  // Interview performance features (from meeting intelligence)
  interview_performance_exists: boolean;
  interview_communication_clarity: number;
  interview_communication_confidence: number;
  interview_technical_competence: number;
  interview_cultural_fit: number;
  interview_red_flags_count: number;
  interview_green_flags_count: number;
  interview_hiring_recommendation: string;
  interview_answer_quality_avg: number;
  interview_meetings_count: number;
  hiring_manager_style_match: number;
  hiring_manager_cultural_priorities_match: number;
  
  [key: string]: string | number | boolean | undefined; // Allow additional features
}

export interface MLModel {
  id: string;
  version: number;
  model_type: 'xgboost' | 'lightgbm' | 'neural_net' | 'ensemble' | 'baseline';
  model_storage_path: string;
  training_config?: Record<string, unknown>;
  metrics: {
    auc_roc?: number;
    precision_at_10?: number;
    ndcg_at_10?: number;
    interview_rate?: number;
    hire_rate?: number;
  };
  feature_importance?: Record<string, number>;
  training_data_count?: number;
  training_start_time?: string;
  training_end_time?: string;
  status: 'training' | 'testing' | 'active' | 'retired' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MLABTest {
  id: string;
  test_name: string;
  model_a_version: number;
  model_b_version: number;
  traffic_split: number; // 0.0 - 1.0
  target_metric: string;
  hypothesis?: string;
  metrics_a?: Record<string, unknown>;
  metrics_b?: Record<string, unknown>;
  statistical_significance?: number; // p-value
  winner?: 'model_a' | 'model_b' | 'no_difference' | 'pending';
  sample_size_a: number;
  sample_size_b: number;
  status: 'running' | 'completed' | 'stopped';
  started_at: string;
  ended_at?: string;
}

export interface MLPrediction {
  id: string;
  model_version: number;
  candidate_id: string;
  job_id: string;
  prediction_score: number; // P(hire)
  interview_probability?: number;
  predicted_time_to_hire_days?: number;
  rank_position?: number;
  features_used?: MLFeatures;
  shap_values?: ShapExplanation[];
  ab_test_id?: string;
  ab_test_variant?: 'model_a' | 'model_b' | 'control';
  actual_outcome?: 'hired' | 'interviewed' | 'rejected' | 'pending';
  actual_outcome_updated_at?: string;
  created_at: string;
}

export interface ShapExplanation {
  feature_name: string;
  feature_value: string | number | boolean;
  shap_value: number; // Contribution to prediction
  impact_direction: 'positive' | 'negative';
  human_readable: string; // e.g., "+15% skills overlap"
}

export interface MLFeedback {
  id: string;
  prediction_id: string;
  user_id: string;
  user_role: 'candidate' | 'strategist' | 'partner';
  feedback_type: 'boost' | 'block' | 'great_match' | 'not_relevant' | 'wrong_skills' | 'wrong_culture' | 'wrong_salary';
  feedback_score?: number; // 1-5 stars
  feedback_text?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface MLTrainingData {
  id: string;
  candidate_id: string;
  job_id: string;
  application_id?: string;
  company_id?: string;
  features: MLFeatures;
  label_hired: boolean;
  label_interviewed: boolean;
  label_rejected: boolean;
  time_to_hire_days?: number;
  time_to_interview_days?: number;
  rejection_stage?: string;
  match_score_at_time?: number;
  strategist_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface MLModelMetrics {
  id: string;
  model_version: number;
  metric_date: string;
  metric_name: string;
  metric_value: number;
  sample_size?: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
  segment?: string;
  created_at: string;
}

export interface FeatureGenerationRequest {
  candidate_id: string;
  job_id: string;
  application_id?: string;
  use_cache?: boolean;
}

export interface FeatureGenerationResponse {
  features: MLFeatures;
  cached: boolean;
}
