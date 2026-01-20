import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackInput {
  query_id: string;
  feedback_type: 'thumbs_up' | 'thumbs_down' | 'rating' | 'comment' | 'click' | 'dwell';
  rating?: number;
  comment?: string;
  result_id?: string;
  result_rank?: number;
  original_score?: number;
  rerank_score?: number;
  dwell_time_ms?: number;
  context_used?: any;
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

    const feedback: FeedbackInput = await req.json();

    // Validate required fields
    if (!feedback.query_id || !feedback.feedback_type) {
      return new Response(JSON.stringify({ error: 'query_id and feedback_type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate rating if provided
    if (feedback.rating !== undefined && (feedback.rating < 1 || feedback.rating > 5)) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert feedback
    const { data: insertedFeedback, error: insertError } = await supabase
      .from('rag_feedback')
      .insert({
        query_id: feedback.query_id,
        user_id: user.id,
        feedback_type: feedback.feedback_type,
        rating: feedback.rating,
        comment: feedback.comment,
        result_id: feedback.result_id,
        result_rank: feedback.result_rank,
        original_score: feedback.original_score,
        rerank_score: feedback.rerank_score,
        was_clicked: feedback.feedback_type === 'click',
        dwell_time_ms: feedback.dwell_time_ms,
        context_used: feedback.context_used,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting feedback:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trigger adaptive weight update for thumbs feedback
    if (feedback.feedback_type === 'thumbs_up' || feedback.feedback_type === 'thumbs_down') {
      await updateAdaptiveWeights(supabase, user.id, feedback);
    }

    // Log for active learning
    await logForTraining(supabase, user.id, feedback);

    return new Response(JSON.stringify({
      success: true,
      feedback_id: insertedFeedback.id,
      message: getFeedbackMessage(feedback.feedback_type),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Feedback collection error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateAdaptiveWeights(supabase: any, userId: string, feedback: FeedbackInput) {
  try {
    // Get current preferences
    const { data: prefs } = await supabase
      .from('user_search_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const learningRate = 0.02;
    
    if (!prefs) {
      // Create initial preferences
      await supabase
        .from('user_search_preferences')
        .insert({
          user_id: userId,
          semantic_weight: 0.6,
          keyword_weight: 0.4,
          recency_weight: 0.2,
          successful_searches: feedback.feedback_type === 'thumbs_up' ? 1 : 0,
          total_searches: 1,
        });
      return;
    }

    // Calculate adjustments based on feedback context
    let semanticDelta = 0;
    let keywordDelta = 0;

    if (feedback.feedback_type === 'thumbs_down' && feedback.context_used) {
      // Analyze what went wrong and adjust
      const context = feedback.context_used;
      
      if (context.semantic_dominated) {
        semanticDelta = -learningRate;
        keywordDelta = learningRate;
      } else if (context.keyword_dominated) {
        semanticDelta = learningRate;
        keywordDelta = -learningRate;
      }
    }

    // Apply bounded updates
    const newSemanticWeight = Math.max(0.2, Math.min(0.8, prefs.semantic_weight + semanticDelta));
    const newKeywordWeight = Math.max(0.2, Math.min(0.8, prefs.keyword_weight + keywordDelta));

    await supabase
      .from('user_search_preferences')
      .update({
        semantic_weight: newSemanticWeight,
        keyword_weight: newKeywordWeight,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error updating adaptive weights:', error);
  }
}

async function logForTraining(supabase: any, userId: string, feedback: FeedbackInput) {
  try {
    // Log training signal for the reranker
    // This data can be used for fine-tuning or online learning
    
    const trainingSignal = {
      user_id: userId,
      query_id: feedback.query_id,
      result_id: feedback.result_id,
      result_rank: feedback.result_rank,
      label: feedback.feedback_type === 'thumbs_up' || 
             (feedback.rating && feedback.rating >= 4) ? 1 : 
             feedback.feedback_type === 'thumbs_down' ||
             (feedback.rating && feedback.rating <= 2) ? 0 : 0.5,
      original_score: feedback.original_score,
      rerank_score: feedback.rerank_score,
      dwell_time_ms: feedback.dwell_time_ms,
      timestamp: new Date().toISOString(),
    };

    // Store in a format suitable for batch training
    // Could be sent to a message queue or stored for batch processing
    console.log('Training signal logged:', trainingSignal);
    
  } catch (error) {
    console.error('Error logging for training:', error);
  }
}

function getFeedbackMessage(type: string): string {
  switch (type) {
    case 'thumbs_up':
      return 'Thanks for the positive feedback! This helps QUIN learn.';
    case 'thumbs_down':
      return 'Thanks for letting us know. QUIN will improve based on your feedback.';
    case 'rating':
      return 'Rating recorded. Thank you!';
    case 'comment':
      return 'Comment received. We appreciate your detailed feedback.';
    case 'click':
      return 'Click recorded.';
    case 'dwell':
      return 'Engagement recorded.';
    default:
      return 'Feedback recorded.';
  }
}
