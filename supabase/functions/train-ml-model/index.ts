import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TreeNode {
  feature?: string;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number;
}

interface GradientBoostingModel {
  trees: TreeNode[];
  learning_rate: number;
  feature_importance: Record<string, number>;
  base_prediction: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      n_estimators = 50,
      learning_rate = 0.1,
      max_depth = 6,
      min_samples_split = 10,
      validation_split = 0.2
    } = await req.json();

    console.log('Starting ML model training...');

    // Get next model version
    const { data: latestModel } = await supabase
      .from('ml_models')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const modelVersion = (latestModel?.version || 0) + 1;

    // Create training run record
    const { data: trainingRun, error: runError } = await supabase
      .from('ml_training_runs')
      .insert({
        model_version: modelVersion,
        hyperparameters: {
          n_estimators,
          learning_rate,
          max_depth,
          min_samples_split
        },
        status: 'running'
      })
      .select()
      .single();

    if (runError) throw runError;

    try {
      // Fetch training data
      const { data: trainingDataRaw } = await supabase.rpc('get_ml_training_data', {
        limit_count: 10000,
        offset_count: 0
      });

      if (!trainingDataRaw || trainingDataRaw.length === 0) {
        throw new Error('No training data available');
      }

      console.log(`Training with ${trainingDataRaw.length} samples`);

      // Extract features and labels
      const samples = trainingDataRaw.map((row: any) => {
        const features = row.features as Record<string, number>;
        return {
          features: {
            ...features,
            semantic_similarity_score: row.semantic_similarity_score || 0
          },
          label: row.label_hired ? 1 : 0
        };
      });

      // Split into training and validation
      const splitIdx = Math.floor(samples.length * (1 - validation_split));
      const trainSamples = samples.slice(0, splitIdx);
      const valSamples = samples.slice(splitIdx);

      console.log(`Train: ${trainSamples.length}, Validation: ${valSamples.length}`);

      // Train gradient boosted trees
      const model = trainGradientBoosting(trainSamples, {
        n_estimators,
        learning_rate,
        max_depth,
        min_samples_split
      });

      // Calculate metrics on validation set
      const predictions = valSamples.map((s: any) => predict(model, s.features));
      const labels = valSamples.map((s: any) => s.label);

      const metrics = calculateMetrics(predictions, labels);
      console.log('Validation metrics:', metrics);

      // Store model
      const { error: modelError } = await supabase
        .from('ml_models')
        .insert({
          version: modelVersion,
          model_type: 'xgboost',
          model_weights: model,
          training_config: {
            n_estimators,
            learning_rate,
            max_depth,
            min_samples_split
          },
          metrics,
          feature_importance: model.feature_importance,
          training_data_count: trainSamples.length,
          status: 'testing'
        });

      if (modelError) throw modelError;

      // Update training run
      await supabase
        .from('ml_training_runs')
        .update({
          training_end_time: new Date().toISOString(),
          training_samples_count: trainSamples.length,
          validation_samples_count: valSamples.length,
          metrics,
          feature_importance: model.feature_importance,
          status: 'completed'
        })
        .eq('id', trainingRun.id);

      console.log(`Model v${modelVersion} training completed successfully`);

      return new Response(
        JSON.stringify({
          model_version: modelVersion,
          metrics,
          feature_importance: model.feature_importance,
          training_samples: trainSamples.length,
          validation_samples: valSamples.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (trainError) {
      // Update training run as failed
      const errorMsg = trainError instanceof Error ? trainError.message : 'Training failed';
      await supabase
        .from('ml_training_runs')
        .update({
          status: 'failed',
          error_message: errorMsg,
          training_end_time: new Date().toISOString()
        })
        .eq('id', trainingRun.id);

      throw trainError;
    }

  } catch (error) {
    console.error('Error in train-ml-model:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simplified gradient boosting implementation
function trainGradientBoosting(
  samples: Array<{ features: Record<string, number>; label: number }>,
  config: any
): GradientBoostingModel {
  const { n_estimators, learning_rate, max_depth, min_samples_split } = config;
  
  // Calculate base prediction (average of labels)
  const basePrediction = samples.reduce((sum, s) => sum + s.label, 0) / samples.length;
  
  const trees: TreeNode[] = [];
  const featureImportance: Record<string, number> = {};
  
  // Initialize predictions
  let predictions = samples.map(() => basePrediction);
  
  // Build trees iteratively
  for (let i = 0; i < n_estimators; i++) {
    // Calculate gradients (residuals for squared loss)
    const gradients = samples.map((s, idx) => s.label - predictions[idx]);
    
    // Build tree to fit gradients
    const tree = buildTree(samples, gradients, max_depth, min_samples_split, featureImportance);
    trees.push(tree);
    
    // Update predictions
    predictions = predictions.map((pred, idx) => 
      pred + learning_rate * predictTree(tree, samples[idx].features)
    );
  }
  
  // Normalize feature importance
  const totalImportance = Object.values(featureImportance).reduce((a, b) => a + b, 0);
  Object.keys(featureImportance).forEach(key => {
    featureImportance[key] /= totalImportance;
  });
  
  return {
    trees,
    learning_rate,
    feature_importance: featureImportance,
    base_prediction: basePrediction
  };
}

function buildTree(
  samples: Array<{ features: Record<string, number>; label: number }>,
  gradients: number[],
  maxDepth: number,
  minSamplesSplit: number,
  featureImportance: Record<string, number>,
  depth = 0
): TreeNode {
  // Stopping criteria
  if (depth >= maxDepth || samples.length < minSamplesSplit) {
    return { value: gradients.reduce((a, b) => a + b, 0) / gradients.length };
  }
  
  // Find best split
  const bestSplit = findBestSplit(samples, gradients);
  
  if (!bestSplit) {
    return { value: gradients.reduce((a, b) => a + b, 0) / gradients.length };
  }
  
  // Update feature importance
  featureImportance[bestSplit.feature] = (featureImportance[bestSplit.feature] || 0) + bestSplit.gain;
  
  // Split samples
  const leftSamples: typeof samples = [];
  const rightSamples: typeof samples = [];
  const leftGradients: number[] = [];
  const rightGradients: number[] = [];
  
  samples.forEach((sample, idx) => {
    if (sample.features[bestSplit.feature] <= bestSplit.threshold) {
      leftSamples.push(sample);
      leftGradients.push(gradients[idx]);
    } else {
      rightSamples.push(sample);
      rightGradients.push(gradients[idx]);
    }
  });
  
  return {
    feature: bestSplit.feature,
    threshold: bestSplit.threshold,
    left: buildTree(leftSamples, leftGradients, maxDepth, minSamplesSplit, featureImportance, depth + 1),
    right: buildTree(rightSamples, rightGradients, maxDepth, minSamplesSplit, featureImportance, depth + 1)
  };
}

function findBestSplit(
  samples: Array<{ features: Record<string, number>; label: number }>,
  gradients: number[]
) {
  let bestFeature = '';
  let bestThreshold = 0;
  let bestGain = -Infinity;
  
  const features = Object.keys(samples[0]?.features || {});
  
  for (const feature of features) {
    const values = samples.map(s => s.features[feature]).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) continue;
    
    const sortedValues = [...new Set(values)].sort((a, b) => a - b);
    
    for (let i = 0; i < sortedValues.length - 1; i++) {
      const threshold = (sortedValues[i] + sortedValues[i + 1]) / 2;
      
      const leftGradients: number[] = [];
      const rightGradients: number[] = [];
      
      samples.forEach((sample, idx) => {
        if (sample.features[feature] <= threshold) {
          leftGradients.push(gradients[idx]);
        } else {
          rightGradients.push(gradients[idx]);
        }
      });
      
      if (leftGradients.length === 0 || rightGradients.length === 0) continue;
      
      // Calculate gain (variance reduction)
      const totalVar = variance(gradients);
      const leftVar = variance(leftGradients);
      const rightVar = variance(rightGradients);
      const gain = totalVar - (leftGradients.length / gradients.length) * leftVar - 
                   (rightGradients.length / gradients.length) * rightVar;
      
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = feature;
        bestThreshold = threshold;
      }
    }
  }
  
  return bestGain > 0 ? { feature: bestFeature, threshold: bestThreshold, gain: bestGain } : null;
}

function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

function predictTree(tree: TreeNode, features: Record<string, number>): number {
  if (tree.value !== undefined) return tree.value;
  
  const featureValue = features[tree.feature!];
  if (featureValue <= tree.threshold!) {
    return predictTree(tree.left!, features);
  } else {
    return predictTree(tree.right!, features);
  }
}

function predict(model: GradientBoostingModel, features: Record<string, number>): number {
  let prediction = model.base_prediction;
  for (const tree of model.trees) {
    prediction += model.learning_rate * predictTree(tree, features);
  }
  return 1 / (1 + Math.exp(-prediction)); // Sigmoid for probability
}

function calculateMetrics(predictions: number[], labels: number[]) {
  // AUC-ROC approximation
  const sorted = predictions.map((p, i) => ({ p, l: labels[i] }))
    .sort((a, b) => b.p - a.p);
  
  let auc = 0;
  let positives = 0;
  let negatives = 0;
  
  sorted.forEach(({ l }) => {
    if (l === 1) {
      auc += negatives;
      positives++;
    } else {
      negatives++;
    }
  });
  
  auc = positives > 0 && negatives > 0 ? auc / (positives * negatives) : 0.5;
  
  // Precision@10
  const top10 = sorted.slice(0, Math.min(10, sorted.length));
  const precision_at_10 = top10.filter(({ l }) => l === 1).length / top10.length;
  
  // Interview rate (percentage of positive labels)
  const interview_rate = labels.filter(l => l === 1).length / labels.length;
  
  return {
    auc_roc: auc,
    precision_at_10,
    interview_rate
  };
}
