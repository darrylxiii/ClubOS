import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

interface ActionOutcome {
  action_log_id: string;
  action_type: string;
  expected_outcome: Record<string, unknown>;
  actual_outcome: Record<string, unknown>;
  outcome_quality: number;
  context_at_action: Record<string, unknown>;
}

interface BehaviorRule {
  agent_name: string;
  rule_type: string;
  condition: Record<string, unknown>;
  action_modifier: Record<string, unknown>;
  confidence_score: number;
  learned_from_count: number;
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

    const { operation, data } = await req.json();

    switch (operation) {
      case 'analyze_performance': {
        // Analyze agent performance over the last week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Get action outcomes from the last week
        const { data: outcomes, error: outcomesError } = await supabase
          .from('agent_action_outcomes')
          .select('*')
          .gte('created_at', weekAgo.toISOString());

        if (outcomesError) throw outcomesError;

        // Group by action type and analyze patterns
        const actionTypeStats: Record<string, {
          total: number;
          positive: number;
          negative: number;
          avgQuality: number;
        }> = {};

        for (const outcome of outcomes || []) {
          const type = outcome.action_type;
          if (!actionTypeStats[type]) {
            actionTypeStats[type] = { total: 0, positive: 0, negative: 0, avgQuality: 0 };
          }
          actionTypeStats[type].total++;
          if (outcome.outcome_quality > 0) {
            actionTypeStats[type].positive++;
          } else if (outcome.outcome_quality < 0) {
            actionTypeStats[type].negative++;
          }
          actionTypeStats[type].avgQuality += outcome.outcome_quality;
        }

        // Calculate averages
        for (const type of Object.keys(actionTypeStats)) {
          actionTypeStats[type].avgQuality /= actionTypeStats[type].total;
        }

        // Identify patterns that lead to good/bad outcomes
        const patterns = await identifyPatterns(supabase, outcomes || []);

        // Generate or update behavior rules based on patterns
        for (const pattern of patterns) {
          if (pattern.confidence > 0.7) {
            await upsertBehaviorRule(supabase, pattern);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          stats: actionTypeStats,
          patterns: patterns.length,
          period: { start: weekAgo.toISOString(), end: new Date().toISOString() }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'record_outcome': {
        // Record the outcome of an agent action
        const { actionLogId, expectedOutcome, actualOutcome, outcomeQuality, context } = data;

        // Extract learnings from the outcome
        const learnings = await extractLearnings(
          expectedOutcome,
          actualOutcome,
          outcomeQuality,
          context
        );

        const { error } = await supabase
          .from('agent_action_outcomes')
          .insert({
            action_log_id: actionLogId,
            action_type: context?.action_type || 'unknown',
            expected_outcome: expectedOutcome,
            actual_outcome: actualOutcome,
            outcome_quality: outcomeQuality,
            context_at_action: context,
            learnings_extracted: learnings,
            user_id: data.userId
          });

        if (error) throw error;

        // If this was a notably good or bad outcome, update behavior rules immediately
        if (Math.abs(outcomeQuality) > 0.7) {
          await updateBehaviorRulesFromOutcome(supabase, {
            action_type: context?.action_type,
            outcome_quality: outcomeQuality,
            context
          });
        }

        return new Response(JSON.stringify({
          success: true,
          learnings
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_behavior_rules': {
        // Get active behavior rules for a specific agent
        const { agentName } = data;

        const { data: rules, error } = await supabase
          .from('agent_behavior_rules')
          .select('*')
          .eq('agent_name', agentName || 'quin')
          .eq('is_active', true)
          .gte('confidence_score', 0.5)
          .order('confidence_score', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          rules
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'validate_rules': {
        // Validate and potentially deactivate rules that are no longer accurate
        const { data: rules, error } = await supabase
          .from('agent_behavior_rules')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        let deactivatedCount = 0;
        for (const rule of rules || []) {
          const totalOutcomes = (rule.positive_outcomes || 0) + (rule.negative_outcomes || 0);
          if (totalOutcomes > 10) {
            const successRate = (rule.positive_outcomes || 0) / totalOutcomes;
            if (successRate < 0.4) {
              // Deactivate rules that are performing poorly
              await supabase
                .from('agent_behavior_rules')
                .update({ 
                  is_active: false, 
                  updated_at: new Date().toISOString() 
                })
                .eq('id', rule.id);
              deactivatedCount++;
            }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          validated: rules?.length || 0,
          deactivated: deactivatedCount
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
    console.error('Error in analyze-agent-performance:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function identifyPatterns(
  supabase: any,
  outcomes: ActionOutcome[]
): Promise<Array<{ 
  pattern: string; 
  condition: Record<string, unknown>; 
  confidence: number;
  action_modifier: Record<string, unknown>;
}>> {
  const patterns: Array<{ 
    pattern: string; 
    condition: Record<string, unknown>; 
    confidence: number;
    action_modifier: Record<string, unknown>;
  }> = [];

  // Group outcomes by action type
  const byActionType = new Map<string, typeof outcomes>();
  for (const outcome of outcomes) {
    const type = outcome.action_type;
    if (!byActionType.has(type)) {
      byActionType.set(type, []);
    }
    byActionType.get(type)!.push(outcome);
  }

  // For each action type, find common patterns in successful vs failed outcomes
  for (const [actionType, typeOutcomes] of byActionType) {
    const positive = typeOutcomes.filter(o => o.outcome_quality > 0.3);
    const negative = typeOutcomes.filter(o => o.outcome_quality < -0.3);

    if (positive.length >= 3 && negative.length >= 3) {
      // Analyze context differences
      // This is a simplified pattern detection - in production, use ML
      const pattern = {
        pattern: `${actionType}_context_pattern`,
        condition: {
          action_type: actionType,
          min_samples: positive.length
        },
        confidence: positive.length / (positive.length + negative.length),
        action_modifier: {
          prefer_conditions: extractCommonContextFields(positive),
          avoid_conditions: extractCommonContextFields(negative)
        }
      };
      patterns.push(pattern);
    }
  }

  return patterns;
}

function extractCommonContextFields(
  outcomes: ActionOutcome[]
): Record<string, unknown> {
  // Simplified extraction - find common fields in successful contexts
  const contexts = outcomes.map(o => o.context_at_action).filter(Boolean);
  if (contexts.length === 0) return {};

  const commonFields: Record<string, unknown> = {};
  const firstContext = contexts[0];
  
  for (const key of Object.keys(firstContext)) {
    const values = contexts.map(c => c[key]).filter(v => v !== undefined);
    if (values.length === contexts.length) {
      // All outcomes have this field
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];
      if (uniqueValues.length === 1) {
        // All have the same value
        commonFields[key] = JSON.parse(uniqueValues[0]);
      }
    }
  }

  return commonFields;
}

async function extractLearnings(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  quality: number,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const learnings: Record<string, unknown> = {
    outcome_matched: quality > 0,
    quality_score: quality,
    timestamp: new Date().toISOString()
  };

  // Compare expected vs actual
  if (expected && actual) {
    const expectedKeys = Object.keys(expected);
    const matchedKeys = expectedKeys.filter(k => 
      JSON.stringify(expected[k]) === JSON.stringify(actual[k])
    );
    learnings.field_match_rate = matchedKeys.length / expectedKeys.length;
    learnings.mismatched_fields = expectedKeys.filter(k => 
      JSON.stringify(expected[k]) !== JSON.stringify(actual[k])
    );
  }

  // Add context insights
  if (context) {
    learnings.context_summary = {
      action_type: context.action_type,
      entity_type: context.entity_type,
      had_deadline: !!context.deadline
    };
  }

  return learnings;
}

async function upsertBehaviorRule(
  supabase: any,
  pattern: { 
    pattern: string; 
    condition: Record<string, unknown>; 
    confidence: number;
    action_modifier: Record<string, unknown>;
  }
) {
  const { error } = await supabase
    .from('agent_behavior_rules')
    .upsert({
      agent_name: 'quin',
      rule_type: 'learned',
      rule_description: pattern.pattern,
      condition: pattern.condition,
      action_modifier: pattern.action_modifier,
      confidence_score: pattern.confidence,
      learned_from_count: 1,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'agent_name,rule_type,rule_description',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error upserting behavior rule:', error);
  }
}

async function updateBehaviorRulesFromOutcome(
  supabase: any,
  outcome: { action_type: string; outcome_quality: number; context: Record<string, unknown> }
) {
  // Find relevant rules
  const { data: rules } = await supabase
    .from('agent_behavior_rules')
    .select('*')
    .eq('is_active', true)
    .contains('condition', { action_type: outcome.action_type });

  for (const rule of rules || []) {
    const updateField = outcome.outcome_quality > 0 ? 'positive_outcomes' : 'negative_outcomes';
    const currentValue = rule[updateField] || 0;

    await supabase
      .from('agent_behavior_rules')
      .update({
        [updateField]: currentValue + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', rule.id);
  }
}
