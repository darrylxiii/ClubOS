import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { createFunctionLogger } from "../_shared/function-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const logger = createFunctionLogger('track-ml-outcome');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.logRequest(req.method);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      prediction_id,
      candidate_id,
      job_id,
      outcome
    } = await req.json();

    if (!outcome || !['hired', 'interviewed', 'rejected'].includes(outcome)) {
      throw new Error('Invalid outcome. Must be: hired, interviewed, or rejected');
    }

    logger.info(`Tracking ML outcome: ${outcome}`, { prediction_id: prediction_id || 'new' });
    logger.checkpoint('validated_input');

    // If prediction_id provided, update existing prediction
    if (prediction_id) {
      const { error: updateError } = await supabase
        .from('ml_predictions')
        .update({
          actual_outcome: outcome,
          actual_outcome_updated_at: new Date().toISOString()
        })
        .eq('id', prediction_id);

      if (updateError) throw updateError;

      logger.info(`Updated prediction with outcome`, { prediction_id, outcome });
    }
    // Otherwise, find the prediction by candidate and job
    else if (candidate_id && job_id) {
      const { data: predictions, error: findError } = await supabase
        .from('ml_predictions')
        .select('id, model_version')
        .eq('candidate_id', candidate_id)
        .eq('job_id', job_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (findError) throw findError;

      if (predictions && predictions.length > 0) {
        const { error: updateError } = await supabase
          .from('ml_predictions')
          .update({
            actual_outcome: outcome,
            actual_outcome_updated_at: new Date().toISOString()
          })
          .eq('id', predictions[0].id);

        if (updateError) throw updateError;

        logger.info(`Updated prediction with outcome`, { prediction_id: predictions[0].id, outcome });
      }
    }

    logger.checkpoint('updated_predictions');

    // Update or create training data
    const { data: existingTraining } = await supabase
      .from('ml_training_data')
      .select('id')
      .eq('candidate_id', candidate_id)
      .eq('job_id', job_id)
      .single();

    const trainingRecord = {
      candidate_id,
      job_id,
      label_hired: outcome === 'hired',
      label_interviewed: outcome === 'interviewed' || outcome === 'hired',
      label_rejected: outcome === 'rejected',
      updated_at: new Date().toISOString()
    };

    if (existingTraining) {
      await supabase
        .from('ml_training_data')
        .update(trainingRecord)
        .eq('id', existingTraining.id);
    } else {
      // Generate features for new training data
      try {
        const { data: featureData } = await supabase.functions.invoke(
          'ai-integration',
          {
            body: {
              action: 'generate-ml-features',
              payload: {
                candidate_id,
                job_id,
                use_cache: false
              }
            }
          }
        );

        if (featureData?.features) {
          await supabase
            .from('ml_training_data')
            .insert({
              ...trainingRecord,
              features: featureData.features
            });
        }
      } catch (featureError) {
        logger.warn('Could not generate features for training data', { error: String(featureError) });
      }
    }

    logger.checkpoint('updated_training_data');

    // Check model performance degradation
    const { data: activeModel } = await supabase
      .from('ml_models')
      .select('version, metrics')
      .eq('status', 'active')
      .single();

    if (activeModel) {
      // Get recent predictions with outcomes
      const { data: recentPredictions } = await supabase
        .from('ml_predictions')
        .select('prediction_score, actual_outcome')
        .eq('model_version', activeModel.version)
        .not('actual_outcome', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (recentPredictions && recentPredictions.length >= 20) {
        // Calculate current metrics
        const hiredPredictions = recentPredictions
          .filter(p => p.actual_outcome === 'hired')
          .map(p => p.prediction_score);

        const rejectedPredictions = recentPredictions
          .filter(p => p.actual_outcome === 'rejected')
          .map(p => p.prediction_score);

        const avgHiredScore = hiredPredictions.length > 0
          ? hiredPredictions.reduce((a, b) => a + b, 0) / hiredPredictions.length
          : 0;

        const avgRejectedScore = rejectedPredictions.length > 0
          ? rejectedPredictions.reduce((a, b) => a + b, 0) / rejectedPredictions.length
          : 0;

        const separation = avgHiredScore - avgRejectedScore;

        // Flag if performance degraded significantly
        const originalAuc = activeModel.metrics?.auc_roc || 0.7;
        const estimatedCurrentAuc = 0.5 + (separation / 2);

        if (estimatedCurrentAuc < originalAuc - 0.1) {
          logger.warn('Model performance degraded', {
            originalAuc: originalAuc.toFixed(3),
            estimatedCurrentAuc: estimatedCurrentAuc.toFixed(3),
            recommendation: 'Consider retraining the model'
          });
        }
      }
    }

    logger.logSuccess(200, { outcome });

    return new Response(
      JSON.stringify({
        success: true,
        outcome,
        message: 'Outcome tracked successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.logError(500, errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
