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

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

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

    // Get job data with embedding
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, embedding, embedding_generated_at')
      .eq('id', job_id)
      .single();

    if (jobError) throw jobError;
    if (!job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for job if it doesn't exist
    if (!job.embedding) {
      console.log(`[ML Match] Job ${job_id} has no embedding, generating...`);
      const { error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
        body: { entity_type: 'job', entity_id: job_id }
      });

      if (embeddingError) {
        console.error('[ML Match] Failed to generate job embedding:', embeddingError);
        // Fall back to rule-based matching with default version
        return await fallbackRuleBasedMatching(supabase, job_id, candidate_ids, limit, 1);
      }

      // Fetch the job again with the new embedding
      const { data: updatedJob } = await supabase
        .from('jobs')
        .select('embedding')
        .eq('id', job_id)
        .single();

      if (updatedJob?.embedding) {
        job.embedding = updatedJob.embedding;
      }
    }

    // Get active model version
    const { data: activeModel } = await supabase
      .from('ml_models')
      .select('version, model_type, metrics')
      .eq('status', 'active')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const modelVersion = activeModel?.version || 1; // Version 1 = Vector Search
    console.log(`[ML Match] Using model version: ${modelVersion} (${activeModel?.model_type || 'vector_search'})`);

    // === VECTOR SEARCH: Semantic Matching ===
    let candidateMatches: any[] = [];

    if (job.embedding && (!candidate_ids || candidate_ids.length === 0)) {
      // Use vector similarity search to find best matches
      const { data: vectorMatches, error: vectorError } = await supabase
        .rpc('match_candidates_to_job', {
          query_embedding: job.embedding,
          match_threshold: 0.3, // Minimum 30% similarity
          match_count: limit * 2 // Get more candidates for hybrid scoring
        });

      if (vectorError) {
        console.error('[ML Match] Vector search error:', vectorError);
        // Fall back to rule-based
        return await fallbackRuleBasedMatching(supabase, job_id, candidate_ids, limit, modelVersion);
      }

      candidateMatches = vectorMatches || [];
      console.log(`[ML Match] Vector search found ${candidateMatches.length} semantic matches`);
    } else if (candidate_ids && candidate_ids.length > 0) {
      // Specific candidates requested - fetch them
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('id, user_id')
        .in('id', candidate_ids);

      candidateMatches = (candidates || []).map(c => ({ profile_id: c.id, similarity: 0.5 }));
    }

    if (candidateMatches.length === 0) {
      return new Response(
        JSON.stringify({ predictions: [], model_version: modelVersion }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ML Match] Scoring ${candidateMatches.length} candidates with hybrid model`);

    // Generate features and hybrid predictions for each candidate
    const predictions: Prediction[] = [];

    for (const match of candidateMatches) {
      try {
        // Generate features
        const { data: featureData, error: featureError } = await supabase.functions.invoke(
          'ai-integration',
          {
            body: {
              action: 'generate-ml-features',
              payload: {
                candidate_id: match.profile_id,
                job_id: job_id,
                use_cache: true,
              }
            }
          }
        );

        if (featureError) {
          console.error(`[ML Match] Feature error for ${match.profile_id}:`, featureError);
          continue;
        }

        const features = featureData.features;

        // === HYBRID SCORING: Vector Similarity + Feature-Based ===
        const vectorScore = match.similarity || 0; // 0-1 from cosine similarity
        const featureScore = calculateFeatureScore(features); // 0-1 from features

        // Weighted combination: 60% vector, 40% features
        const hybridScore = (vectorScore * 0.6) + (featureScore * 0.4);

        // Generate SHAP-like explanations
        const shapValues = generateHybridExplanations(features, vectorScore, featureScore, hybridScore);

        // Calculate derived metrics
        const interviewProbability = hybridScore * 0.45; // ~45% of good matches get interviews
        const baseTimeToHire = 35;
        const urgencyFactor = features.job_is_urgent ? 0.7 : 1.0;
        const experienceFactor = features.experience_years_match > 0.8 ? 0.9 : 1.1;
        const predictedTimeToHire = Math.round(baseTimeToHire * urgencyFactor * experienceFactor);

        predictions.push({
          candidate_id: match.profile_id,
          job_id: job_id,
          prediction_score: Math.round(hybridScore * 10000) / 10000,
          interview_probability: Math.round(interviewProbability * 10000) / 10000,
          predicted_time_to_hire_days: predictedTimeToHire,
          rank_position: 0, // Will be set after sorting
          shap_values: shapValues,
          features_used: {
            ...features,
            vector_similarity: vectorScore,
            feature_score: featureScore,
            hybrid_score: hybridScore
          },
        });
      } catch (error) {
        console.error(`[ML Match] Error scoring candidate ${match.profile_id}:`, error);
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
        model_type: 'hybrid_vector_features',
        total_scored: predictions.length,
        vector_search_enabled: true,
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

// === FEATURE-BASED SCORING ===
// Calculates a 0-1 score from engineered features
function calculateFeatureScore(features: any): number {
  const weights = {
    skills_match: 0.30,
    experience_match: 0.25,
    salary_match: 0.15,
    location_match: 0.15,
    profile_quality: 0.10,
    activity_level: 0.05,
  };

  let score = 0;

  score += (features.skills_match_percentage || 0) * weights.skills_match;
  score += (features.experience_years_match || 0) * weights.experience_match;
  score += (features.salary_in_range || 0.5) * weights.salary_match;
  score += (features.location_remote_compatible || 0.5) * weights.location_match;
  score += (features.candidate_profile_completeness || 0.5) * weights.profile_quality;

  const daysInactive = features.candidate_last_active_days_ago || 30;
  const activityScore = Math.max(0, 1 - (daysInactive / 90));
  score += activityScore * weights.activity_level;

  return Math.max(0, Math.min(1, score));
}

// === FALLBACK: Rule-Based Matching ===
async function fallbackRuleBasedMatching(
  supabase: any,
  job_id: string,
  candidate_ids: string[] | undefined,
  limit: number,
  modelVersion: number
) {
  console.log('[ML Match] Using fallback rule-based matching');

  let candidateQuery = supabase
    .from('candidate_profiles')
    .select('id, user_id')
    .limit(limit);

  if (candidate_ids && candidate_ids.length > 0) {
    candidateQuery = candidateQuery.in('id', candidate_ids);
  }

  const { data: candidates } = await candidateQuery;

  if (!candidates || candidates.length === 0) {
    return new Response(
      JSON.stringify({ predictions: [], model_version: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const predictions: Prediction[] = [];

  for (const candidate of candidates) {
    try {
      const { data: featureData } = await supabase.functions.invoke(
        'ai-integration',
        {
          body: {
            action: 'generate-ml-features',
            payload: { candidate_id: candidate.id, job_id: job_id, use_cache: true }
          }
        }
      );

      if (!featureData) continue;

      const features = featureData.features;
      const prediction = calculateBaselinePrediction(features);
      const shapValues = generateShapExplanations(features, prediction.prediction_score);

      predictions.push({
        candidate_id: candidate.id,
        job_id: job_id,
        prediction_score: prediction.prediction_score,
        interview_probability: prediction.interview_probability,
        predicted_time_to_hire_days: prediction.predicted_time_to_hire_days,
        rank_position: 0,
        shap_values: shapValues,
        features_used: features,
      });
    } catch (error) {
      console.error(`[ML Match] Error in fallback for ${candidate.id}:`, error);
    }
  }

  predictions.sort((a, b) => b.prediction_score - a.prediction_score);
  predictions.forEach((pred, index) => { pred.rank_position = index + 1; });

  return new Response(
    JSON.stringify({
      predictions: predictions.slice(0, limit),
      model_version: 0,
      model_type: 'baseline_fallback',
      total_scored: predictions.length,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// === BASELINE PREDICTION MODEL ===
// Weighted scoring algorithm (will be replaced by trained ML model)
function calculateBaselinePrediction(features: any): {
  prediction_score: number;
  interview_probability: number;
  predicted_time_to_hire_days: number;
} {
  // Weights optimized from historical data (to be replaced by ML)
  const weights = {
    skills_match: 0.35,
    experience_match: 0.25,
    salary_match: 0.15,
    location_match: 0.10,
    profile_quality: 0.08,
    activity_level: 0.05,
    job_attractiveness: 0.02,
  };

  // Calculate weighted score
  let score = 0;

  // Skills match (0-1)
  const skillsScore = features.skills_match_percentage || 0;
  score += skillsScore * weights.skills_match;

  // Experience match (0-1)
  const experienceScore = features.experience_years_match || 0;
  score += experienceScore * weights.experience_match;

  // Salary match (0-1)
  const salaryScore = features.salary_in_range || 0.5;
  score += salaryScore * weights.salary_match;

  // Location match (0-1)
  const locationScore = features.location_remote_compatible || 0.5;
  score += locationScore * weights.location_match;

  // Profile quality (0-1)
  const profileScore = features.candidate_profile_completeness || 0.5;
  score += profileScore * weights.profile_quality;

  // Activity level (inverse of days since active, normalized)
  const daysInactive = features.candidate_last_active_days_ago || 30;
  const activityScore = Math.max(0, 1 - (daysInactive / 90));
  score += activityScore * weights.activity_level;

  // Job attractiveness (0-1)
  const jobScore = features.job_attractiveness_score || 0.5;
  score += jobScore * weights.job_attractiveness;

  // Normalize to 0-1 range
  const predictionScore = Math.max(0, Math.min(1, score));

  // Interview probability (adjusted based on historical conversion rates)
  const interviewProbability = predictionScore * 0.40; // ~40% of good matches get interviews

  // Predicted time to hire (based on historical averages)
  const baseTimeToHire = 35; // days
  const urgencyFactor = features.job_is_urgent ? 0.7 : 1.0;
  const experienceFactor = experienceScore > 0.8 ? 0.9 : 1.1;
  const predictedTimeToHire = Math.round(baseTimeToHire * urgencyFactor * experienceFactor);

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
      human_readable: `${features.candidate_years_experience || 0} years experience ${experienceMatch > 0.8 ? '(perfect fit)' : experienceMatch < 0.3 ? '(underqualified)' : ''
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

// Generate human-readable explanations for hybrid model
function generateHybridExplanations(features: any, vectorScore: number, featureScore: number, hybridScore: number): ShapExplanation[] {
  const explanations: ShapExplanation[] = [];

  // Vector similarity (most important in hybrid model)
  explanations.push({
    feature_name: 'semantic_similarity',
    feature_value: Math.round(vectorScore * 100),
    shap_value: vectorScore * 0.6, // 60% weight
    impact_direction: vectorScore > 0.5 ? 'positive' : 'negative',
    human_readable: `${Math.round(vectorScore * 100)}% semantic match ${vectorScore > 0.7 ? '(excellent fit)' : vectorScore > 0.5 ? '(good fit)' : '(weak fit)'}`,
  });

  // Skills match
  const skillsMatch = features.skills_match_percentage || 0;
  if (skillsMatch > 0) {
    explanations.push({
      feature_name: 'skills_match_percentage',
      feature_value: Math.round(skillsMatch * 100),
      shap_value: skillsMatch * 0.12, // 30% of 40% feature weight
      impact_direction: skillsMatch > 0.5 ? 'positive' : 'negative',
      human_readable: `${Math.round(skillsMatch * 100)}% required skills match`,
    });
  }

  // Experience match
  const experienceMatch = features.experience_years_match || 0;
  explanations.push({
    feature_name: 'experience_years_match',
    feature_value: features.candidate_years_experience,
    shap_value: experienceMatch * 0.10, // 25% of 40% feature weight
    impact_direction: experienceMatch > 0.5 ? 'positive' : 'negative',
    human_readable: `${features.candidate_years_experience || 0} years experience ${experienceMatch > 0.8 ? '(perfect fit)' : experienceMatch < 0.3 ? '(underqualified)' : ''
      }`,
  });

  // Location/remote
  const locationMatch = features.location_remote_compatible || 0;
  if (locationMatch !== 0.5) {
    explanations.push({
      feature_name: 'location_remote_compatible',
      feature_value: locationMatch,
      shap_value: locationMatch * 0.06, // 15% of 40% feature weight
      impact_direction: locationMatch > 0.5 ? 'positive' : 'negative',
      human_readable: locationMatch > 0.5
        ? 'Remote/location compatible'
        : 'Location mismatch',
    });
  }

  // Profile quality
  const profileQuality = features.candidate_profile_completeness || 0;
  explanations.push({
    feature_name: 'profile_quality_score',
    feature_value: Math.round(profileQuality * 100),
    shap_value: profileQuality * 0.04, // 10% of 40% feature weight
    impact_direction: profileQuality > 0.7 ? 'positive' : 'negative',
    human_readable: `${Math.round(profileQuality * 100)}% profile completeness`,
  });

  // Sort by absolute impact
  explanations.sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));

  // Return top 5
  return explanations.slice(0, 5);
}
