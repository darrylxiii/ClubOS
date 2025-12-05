/**
 * ML Match Candidates Edge Function
 * 
 * Inference endpoint for the ML matching engine.
 * Scores candidates for a given job using the active ML model.
 * 
 * Usage:
 * POST /ml-match-candidates
 * Body: { job_id, candidate_ids?, limit? }
 * 
 * Returns: { predictions: [...], model_version, shap_explanations }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  job_id: string;
  candidate_ids?: string[];
  limit?: number;
  ab_test_id?: string;
}

interface Prediction {
  candidate_id: string;
  job_id: string;
  prediction_score: number;
  interview_probability: number;
  predicted_time_to_hire_days: number;
  rank_position: number;
  shap_values: ShapExplanation[];
  features_used: Record<string, any>;
}

interface ShapExplanation {
  feature_name: string;
  feature_value: any;
  shap_value: number;
  impact_direction: 'positive' | 'negative';
  human_readable: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id, candidate_ids, limit = 50, ab_test_id }: MatchRequest = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ML Match] Matching candidates for job: ${job_id}`);

    // Load active ML model if available
    const { data: activeModel } = await supabase
      .from('ml_models')
      .select('*')
      .eq('status', 'active')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const useMLModel = activeModel && activeModel.model_weights;
    const modelVersion = activeModel?.version || 0;
    console.log(`[ML Match] Using ${useMLModel ? 'trained' : 'baseline'} model v${modelVersion}`);

    // Get candidates to score
    let candidateQuery = supabase
      .from('candidate_profiles')
      .select('id, user_id')
      .limit(limit);

    if (candidate_ids && candidate_ids.length > 0) {
      candidateQuery = candidateQuery.in('id', candidate_ids);
    }

    const { data: candidates, error: candidatesError } = await candidateQuery;

    if (candidatesError) throw candidatesError;
    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ predictions: [], model_version: modelVersion }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ML Match] Scoring ${candidates.length} candidates`);

    // Generate features and predictions for each candidate
    const predictions: Prediction[] = [];

    for (const candidate of candidates) {
      try {
        // Generate features
        const { data: featureData, error: featureError } = await supabase.functions.invoke(
          'generate-ml-features',
          {
            body: {
              candidate_id: candidate.id,
              job_id: job_id,
              use_cache: true,
            },
          }
        );

        if (featureError) {
          console.error(`[ML Match] Feature error for ${candidate.id}:`, featureError);
          continue;
        }

        const features = featureData.features;

        // Fetch assessment scores for enhanced matching
        const { data: assessmentResults } = await supabase
          .from('assessment_results')
          .select('score, assessment_type, results_data')
          .eq('user_id', candidate.user_id || candidate.id)
          .eq('is_latest', true);

        // Fetch interview performance from meeting analysis
        const { data: meetingAnalysis } = await supabase
          .from('meeting_analysis')
          .select('overall_score, communication_score, technical_score')
          .eq('candidate_id', candidate.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Enhance features with assessment and interview data
        const assessmentScore = assessmentResults?.length 
          ? assessmentResults.reduce((sum, a) => sum + (a.score || 0), 0) / assessmentResults.length / 100
          : 0.5;
        
        const interviewScore = meetingAnalysis?.length
          ? meetingAnalysis.reduce((sum, m) => sum + (m.overall_score || 0), 0) / meetingAnalysis.length / 100
          : 0.5;

        const enhancedFeatures = {
          ...features,
          assessment_score: assessmentScore,
          interview_performance: interviewScore,
          assessment_count: assessmentResults?.length || 0,
          interview_count: meetingAnalysis?.length || 0,
        };

        let prediction;
        let shapValues;

        if (useMLModel) {
          // Use trained ML model
          prediction = predictWithTrainedModel(enhancedFeatures, activeModel.model_weights);
          shapValues = generateMLShapExplanations(enhancedFeatures, activeModel.feature_importance || {});
        } else {
          // Fallback to baseline with enhanced features
          prediction = calculateBaselinePrediction(enhancedFeatures);
          shapValues = generateShapExplanations(enhancedFeatures, prediction.prediction_score);
        }

        predictions.push({
          candidate_id: candidate.id,
          job_id: job_id,
          prediction_score: prediction.prediction_score,
          interview_probability: prediction.interview_probability,
          predicted_time_to_hire_days: prediction.predicted_time_to_hire_days,
          rank_position: 0, // Will be set after sorting
          shap_values: shapValues,
          features_used: enhancedFeatures,
        });
      } catch (error) {
        console.error(`[ML Match] Error scoring candidate ${candidate.id}:`, error);
      }
    }

    // Sort by prediction score and assign ranks
    predictions.sort((a, b) => b.prediction_score - a.prediction_score);
    predictions.forEach((pred, index) => {
      pred.rank_position = index + 1;
    });

    console.log(`[ML Match] Generated ${predictions.length} predictions`);

    // Store predictions in database
    const predictionInserts = predictions.map((pred) => ({
      model_version: modelVersion,
      candidate_id: pred.candidate_id,
      job_id: pred.job_id,
      prediction_score: pred.prediction_score,
      interview_probability: pred.interview_probability,
      predicted_time_to_hire_days: pred.predicted_time_to_hire_days,
      rank_position: pred.rank_position,
      features_used: pred.features_used,
      shap_values: pred.shap_values,
      ab_test_id: ab_test_id || null,
      actual_outcome: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('ml_predictions')
      .insert(predictionInserts);

    if (insertError) {
      console.error('[ML Match] Error storing predictions:', insertError);
    }

    return new Response(
      JSON.stringify({
        predictions: predictions.slice(0, limit),
        model_version: modelVersion,
        model_type: activeModel?.model_type || 'baseline',
        total_scored: predictions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ML Match] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// === TRAINED MODEL INFERENCE ===
function predictWithTrainedModel(features: any, modelWeights: any): {
  prediction_score: number;
  interview_probability: number;
  predicted_time_to_hire_days: number;
} {
  const weights = modelWeights as Record<string, number>;
  let prediction = 0.5; // Base prediction
  
  // Apply learned weights to features
  for (const [featureName, featureValue] of Object.entries(features)) {
    if (typeof featureValue === 'number' && weights[featureName]) {
      const normalizedValue = featureValue > 1 ? featureValue / 100 : featureValue;
      prediction += normalizedValue * weights[featureName];
    }
  }
  
  // Clamp to [0, 1]
  const predictionScore = Math.max(0, Math.min(1, prediction));
  
  // Calculate derived metrics
  const interviewProbability = predictionScore * 0.42;
  const baseTimeToHire = 35;
  const urgencyFactor = features.job_is_urgent ? 0.7 : 1.0;
  const predictedTimeToHire = Math.round(baseTimeToHire * urgencyFactor * (2 - predictionScore));
  
  return {
    prediction_score: Math.round(predictionScore * 10000) / 10000,
    interview_probability: Math.round(interviewProbability * 10000) / 10000,
    predicted_time_to_hire_days: predictedTimeToHire
  };
}

// === BASELINE PREDICTION MODEL (Fallback) ===
function calculateBaselinePrediction(features: any): {
  prediction_score: number;
  interview_probability: number;
  predicted_time_to_hire_days: number;
} {
  // Enhanced weights including assessment and interview performance
  const weights = {
    skills_match: 0.25,
    experience_match: 0.15,
    salary_match: 0.12,
    location_match: 0.08,
    semantic_similarity: 0.12,
    profile_quality: 0.06,
    activity_level: 0.02,
    assessment_score: 0.10, // NEW: Assessment performance
    interview_performance: 0.10, // NEW: Past interview performance
  };

  let score = 0;
  score += (features.skills_match_percentage || 0) * weights.skills_match;
  score += (features.experience_years_match || 0) * weights.experience_match;
  score += (features.salary_in_range || 0.5) * weights.salary_match;
  score += (features.location_remote_compatible || 0.5) * weights.location_match;
  score += (features.semantic_similarity_score || 0) * weights.semantic_similarity;
  score += (features.candidate_profile_completeness || 0.5) * weights.profile_quality;
  
  // NEW: Add assessment and interview scores
  score += (features.assessment_score || 0.5) * weights.assessment_score;
  score += (features.interview_performance || 0.5) * weights.interview_performance;
  
  const daysInactive = features.candidate_last_active_days_ago || 30;
  score += Math.max(0, 1 - (daysInactive / 90)) * weights.activity_level;

  const predictionScore = Math.max(0, Math.min(1, score));
  
  // Interview probability boosted by past interview performance
  const interviewBoost = features.interview_count > 0 ? 1.15 : 1.0;
  const interviewProbability = Math.min(predictionScore * 0.40 * interviewBoost, 0.95);
  
  // Time to hire reduced if candidate has good assessment scores
  const baseTimeToHire = 35;
  const urgencyFactor = features.job_is_urgent ? 0.7 : 1.0;
  const assessmentFactor = features.assessment_count > 0 ? 0.85 : 1.0;
  const predictedTimeToHire = Math.round(baseTimeToHire * urgencyFactor * assessmentFactor);

  return {
    prediction_score: Math.round(predictionScore * 10000) / 10000,
    interview_probability: Math.round(interviewProbability * 10000) / 10000,
    predicted_time_to_hire_days: predictedTimeToHire,
  };
}

// Generate human-readable SHAP-like explanations
function generateShapExplanations(features: any, score: number): ShapExplanation[] {
  const explanations: ShapExplanation[] = [];

  // Skills match
  const skillsMatch = features.skills_match_percentage || 0;
  const skillsImpact = skillsMatch * 0.35;
  if (skillsMatch > 0) {
    explanations.push({
      feature_name: 'skills_match_percentage',
      feature_value: Math.round(skillsMatch * 100),
      shap_value: skillsImpact,
      impact_direction: skillsMatch > 0.5 ? 'positive' : 'negative',
      human_readable: `${Math.round(skillsMatch * 100)}% skills match ${skillsImpact > 0.15 ? '(strong fit)' : ''}`,
    });
  }

  // Experience match
  const experienceMatch = features.experience_years_match || 0;
  const experienceImpact = experienceMatch * 0.25;
  if (experienceMatch !== 0) {
    explanations.push({
      feature_name: 'experience_years_match',
      feature_value: features.candidate_years_experience,
      shap_value: experienceImpact,
      impact_direction: experienceMatch > 0.5 ? 'positive' : 'negative',
      human_readable: `${features.candidate_years_experience || 0} years experience ${
        experienceMatch > 0.8 ? '(perfect fit)' : experienceMatch < 0.3 ? '(underqualified)' : ''
      }`,
    });
  }

  // Salary match
  const salaryMatch = features.salary_in_range || 0;
  const salaryImpact = salaryMatch * 0.15;
  if (features.candidate_expected_salary) {
    explanations.push({
      feature_name: 'salary_in_range',
      feature_value: salaryMatch,
      shap_value: salaryImpact,
      impact_direction: salaryMatch > 0 ? 'positive' : 'negative',
      human_readable: salaryMatch > 0 
        ? 'Salary expectations within range' 
        : 'Salary expectations outside range',
    });
  }

  // Location/remote
  const locationMatch = features.location_remote_compatible || 0;
  const locationImpact = locationMatch * 0.10;
  if (locationMatch !== 0.5) {
    explanations.push({
      feature_name: 'location_remote_compatible',
      feature_value: locationMatch,
      shap_value: locationImpact,
      impact_direction: locationMatch > 0.5 ? 'positive' : 'negative',
      human_readable: locationMatch > 0.5 
        ? 'Remote/location compatible' 
        : 'Location mismatch',
    });
  }

  // Profile quality
  const profileQuality = features.candidate_profile_completeness || 0;
  const profileImpact = profileQuality * 0.08;
  explanations.push({
    feature_name: 'profile_quality_score',
    feature_value: Math.round(profileQuality * 100),
    shap_value: profileImpact,
    impact_direction: profileQuality > 0.7 ? 'positive' : 'negative',
    human_readable: `${Math.round(profileQuality * 100)}% profile completeness`,
  });

  // Sort by absolute impact
  explanations.sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));

  // Return top 5
  return explanations.slice(0, 5);
}

// Generate explanations from trained model feature importance
function generateMLShapExplanations(features: any, featureImportance: Record<string, number>): ShapExplanation[] {
  const explanations: ShapExplanation[] = [];
  
  // Sort features by importance
  const sortedFeatures = Object.entries(featureImportance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  for (const [featureName, importance] of sortedFeatures) {
    const featureValue = features[featureName];
    const normalizedValue = typeof featureValue === 'number' && featureValue > 1 
      ? featureValue / 100 
      : featureValue;
    
    explanations.push({
      feature_name: featureName,
      feature_value: featureValue,
      shap_value: importance,
      impact_direction: normalizedValue > 0.5 ? 'positive' : 'negative',
      human_readable: `${featureName.replace(/_/g, ' ')}: ${formatFeatureValue(featureValue)}`
    });
  }
  
  return explanations;
}

function formatFeatureValue(value: any): string {
  if (typeof value === 'number') {
    return value > 1 ? `${Math.round(value)}` : `${Math.round(value * 100)}%`;
  }
  return String(value);
}
