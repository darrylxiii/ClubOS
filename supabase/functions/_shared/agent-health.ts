/**
 * Agent Health Monitoring Utility
 *
 * Tracks per-agent health status with automatic status transitions:
 *   healthy -> degraded (3 consecutive failures)
 *   degraded -> failing (5 consecutive failures)
 *   failing -> offline (10 consecutive failures)
 *
 * Any success resets to healthy.
 */

import type { SupabaseClient } from './handler.ts';

export type AgentStatus = 'healthy' | 'degraded' | 'failing' | 'offline';

interface AgentHealthRecord {
  agent_name: string;
  status: AgentStatus;
  last_heartbeat_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  total_invocations: number;
  total_failures: number;
  avg_duration_ms: number | null;
  metadata: Record<string, unknown>;
}

const STATUS_THRESHOLDS: Record<number, AgentStatus> = {
  3: 'degraded',
  5: 'failing',
  10: 'offline',
};

function computeStatus(consecutiveFailures: number): AgentStatus {
  if (consecutiveFailures >= 10) return 'offline';
  if (consecutiveFailures >= 5) return 'failing';
  if (consecutiveFailures >= 3) return 'degraded';
  return 'healthy';
}

/**
 * Record an agent invocation result and update its health status.
 */
export async function recordAgentInvocation(
  supabase: SupabaseClient,
  agentName: string,
  success: boolean,
  durationMs: number,
  error?: string,
): Promise<AgentHealthRecord | null> {
  const now = new Date().toISOString();

  // Try to get existing record
  const { data: existing } = await supabase
    .from('agent_health')
    .select('*')
    .eq('agent_name', agentName)
    .maybeSingle();

  if (!existing) {
    // Create initial health record
    const newRecord: Record<string, unknown> = {
      agent_name: agentName,
      status: success ? 'healthy' : 'degraded',
      last_heartbeat_at: now,
      last_success_at: success ? now : null,
      last_failure_at: success ? null : now,
      consecutive_failures: success ? 0 : 1,
      total_invocations: 1,
      total_failures: success ? 0 : 1,
      avg_duration_ms: durationMs,
      metadata: error ? { last_error: error } : {},
    };

    const { data, error: insertErr } = await supabase
      .from('agent_health')
      .insert(newRecord)
      .select()
      .single();

    if (insertErr) {
      console.error(`[agent-health] Failed to create record for ${agentName}:`, insertErr.message);
      return null;
    }

    return data as AgentHealthRecord;
  }

  // Update existing record
  const consecutiveFailures = success ? 0 : (existing.consecutive_failures || 0) + 1;
  const totalInvocations = (existing.total_invocations || 0) + 1;
  const totalFailures = (existing.total_failures || 0) + (success ? 0 : 1);
  const newStatus = computeStatus(consecutiveFailures);

  // Running average for duration
  const prevAvg = existing.avg_duration_ms || durationMs;
  const avgDuration = Math.round((prevAvg * (totalInvocations - 1) + durationMs) / totalInvocations);

  const updateData: Record<string, unknown> = {
    status: newStatus,
    last_heartbeat_at: now,
    consecutive_failures: consecutiveFailures,
    total_invocations: totalInvocations,
    total_failures: totalFailures,
    avg_duration_ms: avgDuration,
    updated_at: now,
  };

  if (success) {
    updateData.last_success_at = now;
  } else {
    updateData.last_failure_at = now;
    updateData.metadata = {
      ...(existing.metadata || {}),
      last_error: error,
      last_error_at: now,
    };
  }

  const { data, error: updateErr } = await supabase
    .from('agent_health')
    .update(updateData)
    .eq('agent_name', agentName)
    .select()
    .single();

  if (updateErr) {
    console.error(`[agent-health] Failed to update ${agentName}:`, updateErr.message);
    return null;
  }

  // Log status transitions
  if (existing.status !== newStatus) {
    console.log(`[agent-health] ${agentName}: ${existing.status} -> ${newStatus} (${consecutiveFailures} consecutive failures)`);
  }

  return data as AgentHealthRecord;
}

/**
 * Check health status for all agents.
 * Returns all agents with unhealthy ones flagged.
 */
export async function checkAgentHealth(
  supabase: SupabaseClient,
): Promise<{ agents: AgentHealthRecord[]; unhealthy: AgentHealthRecord[] }> {
  const { data: agents, error } = await supabase
    .from('agent_health')
    .select('*')
    .order('agent_name', { ascending: true });

  if (error) {
    console.error('[agent-health] Failed to check health:', error.message);
    return { agents: [], unhealthy: [] };
  }

  const allAgents = (agents || []) as AgentHealthRecord[];
  const unhealthy = allAgents.filter(a => a.status !== 'healthy');

  return { agents: allAgents, unhealthy };
}

/**
 * Reset an agent's health to healthy (e.g., after manual intervention).
 */
export async function resetAgentHealth(
  supabase: SupabaseClient,
  agentName: string,
): Promise<void> {
  await supabase
    .from('agent_health')
    .update({
      status: 'healthy',
      consecutive_failures: 0,
      updated_at: new Date().toISOString(),
      metadata: { manually_reset_at: new Date().toISOString() },
    })
    .eq('agent_name', agentName);
}

/**
 * Check if an agent is available for invocation.
 * Returns false if the agent is offline.
 */
export async function isAgentAvailable(
  supabase: SupabaseClient,
  agentName: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('agent_health')
    .select('status')
    .eq('agent_name', agentName)
    .maybeSingle();

  // If no record exists, assume available (first run)
  if (!data) return true;

  return data.status !== 'offline';
}
