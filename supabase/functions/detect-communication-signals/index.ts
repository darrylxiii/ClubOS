import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Signal {
  type: string;
  entity_type: string;
  entity_id: string;
  strength: number;
  evidence: {
    summary: string;
    data_points: string[];
  };
  recommended_actions: string[];
}

const SIGNAL_PATTERNS = {
  cooling_off: {
    description: 'Response time has significantly increased',
    threshold: 3, // days
    action: 'Consider a different approach or check-in message'
  },
  heating_up: {
    description: 'Multiple touchpoints in a short period',
    threshold: 3, // messages in 48 hours
    action: 'Prioritize this relationship, schedule a call'
  },
  ready_to_move: {
    description: 'Candidate asking about next steps',
    keywords: ['next steps', 'timeline', 'start date', 'when can', 'how soon'],
    action: 'Fast-track to offer stage'
  },
  budget_approved: {
    description: 'Client has budget approval signals',
    keywords: ['approved', 'signed off', 'green light', 'budget confirmed', 'go ahead'],
    action: 'Move to contract negotiation'
  },
  potential_churn: {
    description: 'Negative sentiment trend detected',
    threshold: -0.3,
    action: 'Schedule urgent relationship repair call'
  },
  high_engagement: {
    description: 'Consistently positive interactions',
    threshold: 0.5,
    action: 'Consider for priority opportunities'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { entity_id, entity_type, analyze_all = false } = await req.json();

    const detectedSignals: Signal[] = [];

    // Get entities to analyze
    let entitiesToAnalyze: { entity_type: string; entity_id: string }[] = [];

    if (analyze_all) {
      // Get unique entity combinations from recent communications
      const { data: recentEntities } = await supabase
        .from('unified_communications')
        .select('entity_type, entity_id')
        .gte('original_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .not('entity_id', 'is', null);

      const uniqueEntities = new Map<string, { entity_type: string; entity_id: string }>();
      recentEntities?.forEach(e => {
        const key = `${e.entity_type}:${e.entity_id}`;
        if (!uniqueEntities.has(key)) {
          uniqueEntities.set(key, e);
        }
      });
      entitiesToAnalyze = Array.from(uniqueEntities.values());
    } else if (entity_id && entity_type) {
      entitiesToAnalyze = [{ entity_type, entity_id }];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either entity_id/entity_type or analyze_all is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const entity of entitiesToAnalyze) {
      // Get communications for this entity
      const { data: communications } = await supabase
        .from('unified_communications')
        .select('*')
        .eq('entity_type', entity.entity_type)
        .eq('entity_id', entity.entity_id)
        .order('original_timestamp', { ascending: false })
        .limit(50);

      if (!communications || communications.length < 2) continue;

      // Analyze response time patterns (cooling_off / heating_up)
      const inboundComms = communications.filter(c => c.direction === 'inbound');
      if (inboundComms.length >= 2) {
        const recentGaps: number[] = [];
        for (let i = 0; i < Math.min(5, inboundComms.length - 1); i++) {
          const gap = new Date(inboundComms[i].original_timestamp).getTime() - 
                      new Date(inboundComms[i + 1].original_timestamp).getTime();
          recentGaps.push(gap / (1000 * 60 * 60 * 24)); // days
        }
        
        const avgRecentGap = recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length;
        
        if (avgRecentGap > SIGNAL_PATTERNS.cooling_off.threshold) {
          detectedSignals.push({
            type: 'cooling_off',
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            strength: Math.min(1, avgRecentGap / 7),
            evidence: {
              summary: `Average response gap increased to ${avgRecentGap.toFixed(1)} days`,
              data_points: [`Last ${recentGaps.length} response gaps: ${recentGaps.map(g => g.toFixed(1) + 'd').join(', ')}`]
            },
            recommended_actions: [SIGNAL_PATTERNS.cooling_off.action]
          });
        }

        // Check for heating up (high frequency)
        const last48Hours = communications.filter(c => 
          new Date(c.original_timestamp).getTime() > Date.now() - 48 * 60 * 60 * 1000
        );
        if (last48Hours.length >= SIGNAL_PATTERNS.heating_up.threshold) {
          detectedSignals.push({
            type: 'heating_up',
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            strength: Math.min(1, last48Hours.length / 5),
            evidence: {
              summary: `${last48Hours.length} communications in last 48 hours`,
              data_points: last48Hours.map(c => `${c.channel}: ${c.subject || c.content_preview?.substring(0, 50) || 'No preview'}`)
            },
            recommended_actions: [SIGNAL_PATTERNS.heating_up.action]
          });
        }
      }

      // Analyze content for keywords
      const recentContent = communications
        .slice(0, 10)
        .map(c => (c.content_preview || '').toLowerCase())
        .join(' ');

      // Ready to move detection
      const readyKeywords = SIGNAL_PATTERNS.ready_to_move.keywords.filter(k => 
        recentContent.includes(k)
      );
      if (readyKeywords.length >= 2) {
        detectedSignals.push({
          type: 'ready_to_move',
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          strength: Math.min(1, readyKeywords.length / 3),
          evidence: {
            summary: 'Candidate showing strong interest in next steps',
            data_points: readyKeywords.map(k => `Mentioned: "${k}"`)
          },
          recommended_actions: [SIGNAL_PATTERNS.ready_to_move.action]
        });
      }

      // Budget approved detection
      const budgetKeywords = SIGNAL_PATTERNS.budget_approved.keywords.filter(k => 
        recentContent.includes(k)
      );
      if (budgetKeywords.length >= 1) {
        detectedSignals.push({
          type: 'budget_approved',
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          strength: Math.min(1, budgetKeywords.length / 2),
          evidence: {
            summary: 'Budget/approval signals detected',
            data_points: budgetKeywords.map(k => `Mentioned: "${k}"`)
          },
          recommended_actions: [SIGNAL_PATTERNS.budget_approved.action]
        });
      }

      // Sentiment analysis
      const sentimentScores = communications
        .filter(c => c.sentiment_score !== null)
        .map(c => c.sentiment_score);
      
      if (sentimentScores.length >= 3) {
        const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
        
        if (avgSentiment <= SIGNAL_PATTERNS.potential_churn.threshold) {
          detectedSignals.push({
            type: 'potential_churn',
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            strength: Math.min(1, Math.abs(avgSentiment)),
            evidence: {
              summary: `Average sentiment is ${avgSentiment.toFixed(2)} (negative trend)`,
              data_points: [`Based on ${sentimentScores.length} analyzed communications`]
            },
            recommended_actions: [SIGNAL_PATTERNS.potential_churn.action]
          });
        } else if (avgSentiment >= SIGNAL_PATTERNS.high_engagement.threshold) {
          detectedSignals.push({
            type: 'high_engagement',
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            strength: Math.min(1, avgSentiment),
            evidence: {
              summary: `Average sentiment is ${avgSentiment.toFixed(2)} (positive trend)`,
              data_points: [`Based on ${sentimentScores.length} analyzed communications`]
            },
            recommended_actions: [SIGNAL_PATTERNS.high_engagement.action]
          });
        }
      }
    }

    // Store detected signals
    for (const signal of detectedSignals) {
      await supabase.from('predictive_signals').upsert({
        signal_type: signal.type,
        entity_type: signal.entity_type,
        entity_id: signal.entity_id,
        signal_strength: signal.strength,
        evidence: signal.evidence,
        recommended_actions: signal.recommended_actions,
        is_active: true,
        detected_at: new Date().toISOString()
      }, {
        onConflict: 'signal_type,entity_type,entity_id'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        entities_analyzed: entitiesToAnalyze.length,
        signals_detected: detectedSignals.length,
        signals: detectedSignals
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-communication-signals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
