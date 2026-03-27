/**
 * Outcome Tracker for the Learning Loop
 *
 * Records outcomes of agent actions and feeds back into agent_behavior_rules
 * to auto-tune confidence scores.
 *
 * Outcome types:
 *   - positive: User accepted suggestion, task completed, email got reply
 *   - negative: User dismissed suggestion, deleted auto-task, overrode action
 *   - user_override: User changed an autonomous action
 *   - neutral: No clear signal either way
 */

import type { SupabaseClient } from './handler.ts';

export type OutcomeType = 'positive' | 'negative' | 'user_override' | 'neutral';

export interface TrackOutcomeParams {
  /** ID of the intelligence_action_log entry this outcome relates to */
  actionLogId?: string;
  /** Correlation ID linking event -> action -> outcome */
  correlationId?: string;
  /** The outcome classification */
  outcomeType: OutcomeType;
  /** Raw outcome data (e.g., user feedback, system metrics) */
  outcomeData?: Record<string, unknown>;
  /** Agent that took the action */
  agentName: string;
  /** Type of action (e.g., send_follow_up, create_task) */
  actionType: string;
  /** Whether the original action was autonomous */
  wasAutonomous?: boolean;
  /** User ID if applicable */
  userId?: string;
  /** Snapshot of context at time of action */
  contextSnapshot?: Record<string, unknown>;
}

/**
 * Track an outcome and update behavior rules accordingly.
 */
export async function trackOutcome(
  supabase: SupabaseClient,
  params: TrackOutcomeParams,
): Promise<{ outcomeId: string | null; ruleUpdated: boolean }> {
  const {
    actionLogId,
    correlationId,
    outcomeType,
    outcomeData = {},
    agentName,
    actionType,
    wasAutonomous = false,
    userId,
    contextSnapshot,
  } = params;

  // 1. Insert outcome record
  const { data: outcome, error: insertErr } = await supabase
    .from('intelligence_outcomes')
    .insert({
      action_log_id: actionLogId || null,
      correlation_id: correlationId || null,
      outcome_type: outcomeType,
      outcome_data: outcomeData,
      agent_name: agentName,
      action_type: actionType,
      was_autonomous: wasAutonomous,
      user_id: userId || null,
      context_snapshot: contextSnapshot || null,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error(`[outcome-tracker] Insert failed:`, insertErr.message);
    return { outcomeId: null, ruleUpdated: false };
  }

  // 2. Update behavior rules based on outcome
  let ruleUpdated = false;

  if (outcomeType === 'positive') {
    const { error } = await supabase.rpc('increment_positive_outcomes', {
      p_agent_name: agentName,
      p_action_type: actionType,
    });

    if (!error) ruleUpdated = true;
  } else if (outcomeType === 'negative' || outcomeType === 'user_override') {
    const { error } = await supabase.rpc('increment_negative_outcomes', {
      p_agent_name: agentName,
      p_action_type: actionType,
    });

    if (!error) ruleUpdated = true;
  }

  return { outcomeId: outcome?.id || null, ruleUpdated };
}

/**
 * Batch analyze outcomes for a time period.
 * Used by the 6-hour full_cycle to identify underperforming actions.
 */
export async function analyzeOutcomes(
  supabase: SupabaseClient,
  hoursBack: number = 24,
): Promise<{
  summaries: OutcomeSummary[];
  warnings: string[];
}> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { data: outcomes, error } = await supabase
    .from('intelligence_outcomes')
    .select('agent_name, action_type, outcome_type, was_autonomous')
    .gte('created_at', since);

  if (error || !outcomes || outcomes.length === 0) {
    return { summaries: [], warnings: [] };
  }

  // Group by agent + action_type
  const groups = new Map<string, { positive: number; negative: number; override: number; neutral: number; total: number }>();

  for (const o of outcomes) {
    const key = `${o.agent_name}:${o.action_type}`;
    const group = groups.get(key) || { positive: 0, negative: 0, override: 0, neutral: 0, total: 0 };

    group.total++;
    if (o.outcome_type === 'positive') group.positive++;
    else if (o.outcome_type === 'negative') group.negative++;
    else if (o.outcome_type === 'user_override') group.override++;
    else group.neutral++;

    groups.set(key, group);
  }

  const summaries: OutcomeSummary[] = [];
  const warnings: string[] = [];

  for (const [key, counts] of groups) {
    const [agentName, actionType] = key.split(':');
    const successRate = counts.total > 0 ? (counts.positive / counts.total) * 100 : 0;

    summaries.push({
      agentName,
      actionType,
      ...counts,
      successRate: Math.round(successRate * 10) / 10,
    });

    // Flag underperforming actions (< 50% success with 10+ samples)
    if (counts.total >= 10 && successRate < 50) {
      warnings.push(
        `${agentName}:${actionType} has ${successRate.toFixed(1)}% success rate (${counts.positive}/${counts.total})`
      );

      // Auto-reduce confidence in behavior rules
      await supabase
        .from('agent_behavior_rules')
        .update({
          confidence_threshold: 0.9, // Raise threshold to reduce autonomous actions
          updated_at: new Date().toISOString(),
        })
        .eq('agent_name', agentName)
        .eq('action_type', actionType)
        .lt('confidence_threshold', 0.9);
    }
  }

  if (warnings.length > 0) {
    console.warn(`[outcome-tracker] Warnings:`, warnings);
  }

  return { summaries, warnings };
}

interface OutcomeSummary {
  agentName: string;
  actionType: string;
  positive: number;
  negative: number;
  override: number;
  neutral: number;
  total: number;
  successRate: number;
}
