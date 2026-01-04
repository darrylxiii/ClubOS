import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictiveSignal {
  signal_type: string;
  entity_type: string;
  entity_id: string;
  confidence_score: number;
  prediction_data: Record<string, unknown>;
  recommended_action: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { operation, userId, data } = await req.json();

    switch (operation) {
      case 'run_predictions': {
        const signals: PredictiveSignal[] = [];

        // 1. Detect withdrawal risk for active candidates
        const withdrawalRisk = await detectWithdrawalRisk(supabase, userId);
        signals.push(...withdrawalRisk);

        // 2. Detect deal acceleration opportunities
        const accelerationOpps = await detectAccelerationOpportunities(supabase, userId);
        signals.push(...accelerationOpps);

        // 3. Detect stale applications
        const staleApps = await detectStaleApplications(supabase, userId);
        signals.push(...staleApps);

        // Store all signals
        if (signals.length > 0) {
          const signalsToInsert = signals.map(s => ({
            ...s,
            user_id: userId,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          }));

          const { error } = await supabase
            .from('predictive_signals')
            .insert(signalsToInsert);

          if (error) console.error('Error inserting signals:', error);
        }

        // Trigger agent actions for high urgency signals
        const criticalSignals = signals.filter(s => s.urgency === 'critical' || s.urgency === 'high');
        for (const signal of criticalSignals) {
          await triggerAgentAction(supabase, signal, userId);
        }

        return new Response(JSON.stringify({
          success: true,
          signals_generated: signals.length,
          critical_count: criticalSignals.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_signals': {
        const { entityType, entityId, limit = 20 } = data || {};

        let query = supabase
          .from('predictive_signals')
          .select('*')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (userId) {
          // For user-specific signals, we need to join with relevant entities
          // This is a simplified version
        }

        if (entityType) {
          query = query.eq('entity_type', entityType);
        }

        if (entityId) {
          query = query.eq('entity_id', entityId);
        }

        const { data: signals, error } = await query;

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          signals
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'mark_signal_outcome': {
        const { signalId, wasAccurate, outcomeData } = data;

        const { error } = await supabase
          .from('predictive_signals')
          .update({
            was_accurate: wasAccurate,
            outcome_data: outcomeData
          })
          .eq('id', signalId);

        if (error) throw error;

        // Update pattern accuracy
        await updatePatternAccuracy(supabase, signalId, wasAccurate);

        return new Response(JSON.stringify({
          success: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in predictive-intelligence-engine:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function detectWithdrawalRisk(
  supabase: any,
  userId: string
): Promise<PredictiveSignal[]> {
  const signals: PredictiveSignal[] = [];

  // Get active applications with low recent engagement
  const { data: applications } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      updated_at,
      user_id,
      job_id
    `)
    .eq('user_id', userId)
    .in('status', ['applied', 'screening', 'interviewing'])
    .order('updated_at', { ascending: true });

  const now = new Date();
  for (const app of applications || []) {
    const daysSinceUpdate = Math.floor(
      (now.getTime() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // If no update in 7+ days, flag as at-risk
    if (daysSinceUpdate >= 7) {
      const riskScore = Math.min(0.95, 0.5 + (daysSinceUpdate - 7) * 0.05);
      
      signals.push({
        signal_type: 'withdrawal_risk',
        entity_type: 'application',
        entity_id: app.id,
        confidence_score: riskScore,
        prediction_data: {
          days_since_update: daysSinceUpdate,
          current_status: app.status
        },
        recommended_action: 'Send follow-up to candidate to maintain engagement',
        urgency: riskScore > 0.8 ? 'high' : 'medium'
      });
    }
  }

  return signals;
}

async function detectAccelerationOpportunities(
  supabase: any,
  userId: string
): Promise<PredictiveSignal[]> {
  const signals: PredictiveSignal[] = [];

  // Find candidates who are progressing quickly through stages
  const { data: applications } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      created_at,
      updated_at,
      user_id,
      job_id
    `)
    .eq('user_id', userId)
    .in('status', ['interviewing', 'offer_stage']);

  for (const app of applications || []) {
    const daysInPipeline = Math.floor(
      (new Date().getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Fast-moving candidates (less than 14 days to interview/offer stage)
    if (daysInPipeline < 14 && app.status === 'offer_stage') {
      signals.push({
        signal_type: 'offer_imminent',
        entity_type: 'application',
        entity_id: app.id,
        confidence_score: 0.85,
        prediction_data: {
          days_in_pipeline: daysInPipeline,
          velocity: 'fast'
        },
        recommended_action: 'Prepare offer documentation and approval workflow',
        urgency: 'high'
      });
    }
  }

  return signals;
}

async function detectStaleApplications(
  supabase: any,
  userId: string
): Promise<PredictiveSignal[]> {
  const signals: PredictiveSignal[] = [];

  const { data: applications } = await supabase
    .from('applications')
    .select('id, status, updated_at')
    .eq('user_id', userId)
    .in('status', ['applied', 'screening'])
    .lt('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  for (const app of applications || []) {
    signals.push({
      signal_type: 'stale_application',
      entity_type: 'application',
      entity_id: app.id,
      confidence_score: 0.9,
      prediction_data: {
        current_status: app.status,
        last_update: app.updated_at
      },
      recommended_action: 'Review application status or archive if no longer active',
      urgency: 'low'
    });
  }

  return signals;
}

async function triggerAgentAction(
  supabase: any,
  signal: PredictiveSignal,
  userId: string
) {
  // Create an agent event for the orchestrator to process
  await supabase.from('agent_events').insert({
    event_type: 'predictive_signal',
    event_source: 'predictive_intelligence',
    entity_type: signal.entity_type,
    entity_id: signal.entity_id,
    user_id: userId,
    event_data: {
      signal_type: signal.signal_type,
      recommended_action: signal.recommended_action,
      urgency: signal.urgency,
      confidence: signal.confidence_score
    },
    priority: signal.urgency === 'critical' ? 10 : signal.urgency === 'high' ? 8 : 5
  });
}

async function updatePatternAccuracy(
  supabase: any,
  signalId: string,
  wasAccurate: boolean
) {
  // Get the signal to find its type
  const { data: signal } = await supabase
    .from('predictive_signals')
    .select('signal_type')
    .eq('id', signalId)
    .single();

  if (!signal) return;

  // Update the pattern's historical accuracy
  const { data: pattern } = await supabase
    .from('signal_patterns')
    .select('*')
    .eq('pattern_name', signal.signal_type)
    .single();

  if (pattern) {
    const newSampleSize = (pattern.sample_size || 0) + 1;
    const newAccuracy = (
      (pattern.historical_accuracy || 0.5) * (pattern.sample_size || 0) + 
      (wasAccurate ? 1 : 0)
    ) / newSampleSize;

    await supabase
      .from('signal_patterns')
      .update({
        historical_accuracy: newAccuracy,
        sample_size: newSampleSize,
        updated_at: new Date().toISOString()
      })
      .eq('id', pattern.id);
  }
}
