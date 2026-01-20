import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchWeights {
  semantic_weight: number;
  keyword_weight: number;
  recency_weight: number;
}

interface WeightAdjustment {
  semantic_delta: number;
  keyword_delta: number;
  recency_delta: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, query_context, feedback_data } = await req.json();

    switch (action) {
      case 'get_weights':
        return await getWeights(supabase, user.id);
      case 'calibrate':
        return await calibrateWeights(supabase, user.id, query_context);
      case 'update_from_feedback':
        return await updateFromFeedback(supabase, user.id, feedback_data);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('Adaptive weights error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getWeights(supabase: any, userId: string) {
  // Get user's personalized weights or create defaults
  let { data: prefs, error } = await supabase
    .from('user_search_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !prefs) {
    // Create default preferences
    const defaultWeights = {
      user_id: userId,
      semantic_weight: 0.6,
      keyword_weight: 0.4,
      recency_weight: 0.2,
    };

    const { data: newPrefs, error: insertError } = await supabase
      .from('user_search_preferences')
      .insert(defaultWeights)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating preferences:', insertError);
      prefs = defaultWeights;
    } else {
      prefs = newPrefs;
    }
  }

  // Calculate adaptive adjustments based on recent feedback
  const adjustments = await calculateAdaptiveAdjustments(supabase, userId, prefs);

  const finalWeights: SearchWeights = {
    semantic_weight: Math.max(0.1, Math.min(0.9, prefs.semantic_weight + adjustments.semantic_delta)),
    keyword_weight: Math.max(0.1, Math.min(0.9, prefs.keyword_weight + adjustments.keyword_delta)),
    recency_weight: Math.max(0.0, Math.min(0.5, prefs.recency_weight + adjustments.recency_delta)),
  };

  // Normalize semantic and keyword weights to sum to 1
  const total = finalWeights.semantic_weight + finalWeights.keyword_weight;
  finalWeights.semantic_weight = finalWeights.semantic_weight / total;
  finalWeights.keyword_weight = finalWeights.keyword_weight / total;

  return new Response(JSON.stringify({
    weights: finalWeights,
    base_weights: {
      semantic_weight: prefs.semantic_weight,
      keyword_weight: prefs.keyword_weight,
      recency_weight: prefs.recency_weight,
    },
    adjustments,
    success_rate: prefs.total_searches > 0 
      ? prefs.successful_searches / prefs.total_searches 
      : null,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function calculateAdaptiveAdjustments(
  supabase: any, 
  userId: string, 
  currentPrefs: any
): Promise<WeightAdjustment> {
  // Get recent feedback to learn from
  const { data: recentFeedback } = await supabase
    .from('rag_feedback')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (!recentFeedback || recentFeedback.length < 5) {
    return { semantic_delta: 0, keyword_delta: 0, recency_delta: 0, reason: 'insufficient_feedback' };
  }

  // Analyze feedback patterns
  const thumbsUp = recentFeedback.filter((f: any) => f.feedback_type === 'thumbs_up');
  const thumbsDown = recentFeedback.filter((f: any) => f.feedback_type === 'thumbs_down');
  
  const positiveRate = thumbsUp.length / recentFeedback.length;
  
  // Analyze which results were clicked (higher engagement)
  const clickedResults = recentFeedback.filter((f: any) => f.was_clicked);
  const avgClickRank = clickedResults.length > 0
    ? clickedResults.reduce((sum: number, f: any) => sum + (f.result_rank || 5), 0) / clickedResults.length
    : 5;

  // Determine adjustments based on patterns
  let adjustment: WeightAdjustment = {
    semantic_delta: 0,
    keyword_delta: 0,
    recency_delta: 0,
    reason: 'adaptive_learning',
  };

  // If positive rate is high, weights are good - make small refinements
  if (positiveRate >= 0.7) {
    adjustment.reason = 'weights_performing_well';
    return adjustment;
  }

  // If users are clicking results lower in the ranking, adjust weights
  if (avgClickRank > 3) {
    // Users finding relevant results lower - try different balance
    if (currentPrefs.semantic_weight > 0.5) {
      adjustment.semantic_delta = -0.05;
      adjustment.keyword_delta = 0.05;
      adjustment.reason = 'increasing_keyword_weight';
    } else {
      adjustment.semantic_delta = 0.05;
      adjustment.keyword_delta = -0.05;
      adjustment.reason = 'increasing_semantic_weight';
    }
  }

  // Check dwell time patterns (longer dwell = more relevant)
  const avgDwellTime = recentFeedback
    .filter((f: any) => f.dwell_time_ms)
    .reduce((sum: number, f: any) => sum + f.dwell_time_ms, 0) / 
    recentFeedback.filter((f: any) => f.dwell_time_ms).length || 0;

  // If dwell time is short, results may not be relevant
  if (avgDwellTime < 5000 && avgDwellTime > 0) {
    adjustment.recency_delta = 0.05; // Try boosting recency
    adjustment.reason = 'boosting_recency_for_relevance';
  }

  return adjustment;
}

async function calibrateWeights(supabase: any, userId: string, queryContext: any) {
  // Analyze query to suggest optimal weights
  const { query, entity_type, time_sensitivity } = queryContext || {};

  let suggestedWeights: SearchWeights = {
    semantic_weight: 0.6,
    keyword_weight: 0.4,
    recency_weight: 0.2,
  };

  // Query-specific calibration
  if (query) {
    const queryLower = query.toLowerCase();
    
    // Exact name lookups benefit from keyword search
    if (/^(find|search|lookup|get)\s+\w+\s+\w+$/i.test(query)) {
      suggestedWeights.semantic_weight = 0.4;
      suggestedWeights.keyword_weight = 0.6;
    }
    
    // Conceptual queries benefit from semantic search
    if (/who|what|why|how|best|recommend|similar/i.test(queryLower)) {
      suggestedWeights.semantic_weight = 0.75;
      suggestedWeights.keyword_weight = 0.25;
    }
    
    // Time-related queries need recency boost
    if (/recent|latest|today|yesterday|this week|last week/i.test(queryLower)) {
      suggestedWeights.recency_weight = 0.4;
    }
  }

  // Entity type calibration
  if (entity_type === 'interaction' || entity_type === 'knowledge') {
    suggestedWeights.recency_weight = 0.3; // Communications need recency
  }

  // Time sensitivity override
  if (time_sensitivity === 'high') {
    suggestedWeights.recency_weight = 0.5;
  } else if (time_sensitivity === 'low') {
    suggestedWeights.recency_weight = 0.1;
  }

  return new Response(JSON.stringify({
    suggested_weights: suggestedWeights,
    calibration_context: queryContext,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateFromFeedback(supabase: any, userId: string, feedbackData: any) {
  const { feedback_type, result_context } = feedbackData;

  // Get current preferences
  const { data: prefs } = await supabase
    .from('user_search_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!prefs) {
    return new Response(JSON.stringify({ error: 'No preferences found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Calculate new weights based on feedback
  const learningRate = 0.02; // Small adjustments
  let newSemanticWeight = prefs.semantic_weight;
  let newKeywordWeight = prefs.keyword_weight;
  let newRecencyWeight = prefs.recency_weight;

  if (feedback_type === 'thumbs_up') {
    // Current weights worked well - reinforce them slightly
    // No major changes needed
  } else if (feedback_type === 'thumbs_down') {
    // Try shifting weights in opposite direction
    if (result_context?.semantic_score > result_context?.keyword_score) {
      // Semantic was dominant - try more keyword
      newSemanticWeight = Math.max(0.2, prefs.semantic_weight - learningRate);
      newKeywordWeight = Math.min(0.8, prefs.keyword_weight + learningRate);
    } else {
      // Keyword was dominant - try more semantic
      newSemanticWeight = Math.min(0.8, prefs.semantic_weight + learningRate);
      newKeywordWeight = Math.max(0.2, prefs.keyword_weight - learningRate);
    }
  }

  // Update preferences
  const { error: updateError } = await supabase
    .from('user_search_preferences')
    .update({
      semantic_weight: newSemanticWeight,
      keyword_weight: newKeywordWeight,
      recency_weight: newRecencyWeight,
      last_calibrated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating preferences:', updateError);
  }

  return new Response(JSON.stringify({
    updated: true,
    new_weights: {
      semantic_weight: newSemanticWeight,
      keyword_weight: newKeywordWeight,
      recency_weight: newRecencyWeight,
    },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
