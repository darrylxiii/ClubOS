import { createHandler } from '../_shared/handler.ts';
import type { SupabaseClient } from '../_shared/handler.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Operation =
  | 'process_event_batch'
  | 'process_queue'
  | 'execute_workflow'
  | 'retry_dlq'
  | 'health_check'
  | 'signal'
  | 'full_cycle';

interface BusRequest {
  operation: Operation;
  config?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

interface AgentEvent {
  id: string;
  event_type: string;
  event_source: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  event_data: Record<string, unknown> | null;
  processed: boolean;
  processed_by: string[] | null;
  processing_results: unknown;
  priority: number;
  retry_count: number;
  last_error: string | null;
  locked_by: string | null;
  locked_at: string | null;
  correlation_id: string | null;
  created_at: string;
}

interface QueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  processing_type: string;
  priority: number;
  status: string;
  attempts: number;
  last_error: string | null;
  metadata?: Record<string, unknown>;
  locked_by: string | null;
  locked_at: string | null;
  correlation_id: string | null;
}

interface CommTaskQueueItem {
  id: string;
  source_table: string;
  source_id: string;
  processing_status: string;
  priority: number;
  error_message: string | null;
  result: unknown;
  locked_by: string | null;
  locked_at: string | null;
  correlation_id: string | null;
}

interface DLQItem {
  id: string;
  source_table: string;
  source_id: string;
  original_payload: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[intelligence-bus]';
const MAX_EVENT_RETRIES = 3;
const DLQ_BASE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/** Maps event types to the agents that should process them. */
const EVENT_AGENT_MAP: Record<string, string[]> = {
  INSERT_applications: ['club_ai', 'analytics_agent', 'engagement_agent'],
  UPDATE_applications: ['club_ai', 'interview_agent', 'analytics_agent'],
  INSERT_pilot_tasks: ['club_ai'],
  UPDATE_pilot_tasks: ['analytics_agent'],
  INSERT_quantum_meetings: ['interview_agent', 'club_ai'],
  UPDATE_quantum_meetings: ['interview_agent'],
  user_action_job_view: ['sourcing_agent'],
  user_action_profile_update: ['club_ai'],
  external_webhook_email: ['engagement_agent'],
  system_deadline_approaching: ['club_ai', 'engagement_agent'],
  job_status_open: ['sourcing_agent', 'club_ai'],
  signal_request_action: [], // resolved dynamically from event_data.target
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(createHandler(async (req, ctx) => {
  const body = await req.json() as BusRequest;
  const { operation, config = {}, data = {} } = body;
  const correlationId = (data.correlation_id as string) ?? crypto.randomUUID();
  const supabase = ctx.supabase;

  console.log(`${LOG_PREFIX} operation=${operation} correlation_id=${correlationId}`);

  try {
    let result: unknown;

    switch (operation) {
      case 'process_event_batch':
        result = await processEventBatch(supabase, config, correlationId);
        break;
      case 'process_queue':
        result = await processQueue(supabase, config, correlationId);
        break;
      case 'execute_workflow':
        result = await executeWorkflow(supabase, data, correlationId);
        break;
      case 'retry_dlq':
        result = await retryDLQ(supabase, correlationId);
        break;
      case 'health_check':
        result = await healthCheck(supabase);
        break;
      case 'signal':
        result = await sendSignal(supabase, data, correlationId);
        break;
      case 'full_cycle':
        result = await fullCycle(supabase, config, correlationId);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
        );
    }

    return new Response(
      JSON.stringify({ success: true, correlation_id: correlationId, result }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} fatal error: ${message}`);
    return new Response(
      JSON.stringify({ success: false, correlation_id: correlationId, error: message }),
      { status: 500, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));

// ===========================================================================
// 1. process_event_batch
// ===========================================================================

async function processEventBatch(
  supabase: SupabaseClient,
  config: Record<string, unknown>,
  correlationId: string,
) {
  const batchSize = (config.batch_size as number) || 100;
  const lockId = `bus_${correlationId}`;

  // Atomically lock a batch of unprocessed events
  const { data: lockedCount, error: lockErr } = await supabase.rpc('lock_agent_events', {
    p_lock_id: lockId,
    p_limit: batchSize,
  });
  if (lockErr) throw new Error(`lock_agent_events failed: ${lockErr.message}`);

  console.log(`${LOG_PREFIX} locked ${lockedCount ?? 0} events (lock=${lockId})`);
  if (!lockedCount) return { processed: 0, deduplicated: 0, failed: 0 };

  // Fetch the locked events
  const { data: events, error: fetchErr } = await supabase
    .from('agent_events')
    .select('*')
    .eq('locked_by', lockId)
    .eq('processed', false)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (fetchErr) throw new Error(`fetch locked events: ${fetchErr.message}`);
  if (!events || events.length === 0) return { processed: 0, deduplicated: 0, failed: 0 };

  let processed = 0;
  let deduplicated = 0;
  let failed = 0;

  // --- Deduplication pass ---------------------------------------------------
  const eventsToProcess: AgentEvent[] = [];

  for (const event of events as AgentEvent[]) {
    const fingerprint = `${event.event_type}:${event.entity_id}:${JSON.stringify(event.event_data || {})}`;

    const { data: existing } = await supabase
      .from('event_deduplication')
      .select('id')
      .eq('event_fingerprint', fingerprint)
      .maybeSingle();

    if (existing) {
      // Duplicate — bump occurrence count and mark processed
      await supabase
        .from('event_deduplication')
        .update({ occurrence_count: supabase.rpc ? undefined : 1, last_seen_at: new Date().toISOString() })
        .eq('id', existing.id);

      // Raw SQL-style increment via rpc is unavailable; use a simple update
      await supabase.rpc('increment_dedup_count', { p_id: existing.id }).catch(() => {
        // Fallback: just update last_seen_at if RPC doesn't exist
        return supabase
          .from('event_deduplication')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', existing.id);
      });

      await markEventProcessed(supabase, event.id, ['intelligence_bus'], {
        action: 'deduplicated',
        fingerprint,
      });
      deduplicated++;
      continue;
    }

    // Insert fingerprint for future dedup
    await supabase.from('event_deduplication').insert({
      event_fingerprint: fingerprint,
      event_type: event.event_type,
      entity_id: event.entity_id,
    });

    eventsToProcess.push(event);
  }

  // --- Group by entity -------------------------------------------------------
  const entityGroups = new Map<string, AgentEvent[]>();
  for (const event of eventsToProcess) {
    const key = `${event.entity_type}:${event.entity_id}`;
    const group = entityGroups.get(key) || [];
    group.push(event);
    entityGroups.set(key, group);
  }

  // --- Process each entity group ---------------------------------------------
  for (const [entityKey, groupEvents] of entityGroups) {
    for (const event of groupEvents) {
      try {
        await processOneEvent(supabase, event, correlationId);
        processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`${LOG_PREFIX} event ${event.id} failed: ${errMsg}`);

        const newRetryCount = (event.retry_count || 0) + 1;

        if (newRetryCount >= MAX_EVENT_RETRIES) {
          // Send to dead letter queue
          await supabase.from('dead_letter_queue').insert({
            source_table: 'agent_events',
            source_id: event.id,
            original_payload: event as unknown as Record<string, unknown>,
            error_message: errMsg,
            retry_count: 0,
            next_retry_at: new Date(Date.now() + DLQ_BASE_DELAY_MS).toISOString(),
          });

          await markEventProcessed(supabase, event.id, ['intelligence_bus'], {
            action: 'sent_to_dlq',
            error: errMsg,
          });
        } else {
          // Increment retry count, record error, unlock for next attempt
          await supabase
            .from('agent_events')
            .update({
              retry_count: newRetryCount,
              last_error: errMsg,
              locked_by: null,
              locked_at: null,
            })
            .eq('id', event.id);
        }

        failed++;
      }
    }
  }

  console.log(`${LOG_PREFIX} batch done: processed=${processed} dedup=${deduplicated} failed=${failed}`);
  return { processed, deduplicated, failed };
}

/** Process a single event: resolve target agents, check autonomy, route. */
async function processOneEvent(
  supabase: SupabaseClient,
  event: AgentEvent,
  correlationId: string,
) {
  // Resolve target agents
  let agents: string[];
  if (event.event_type === 'signal_request_action') {
    const target = (event.event_data as Record<string, unknown>)?.target as string | undefined;
    agents = target ? [target] : ['club_ai'];
  } else {
    agents = EVENT_AGENT_MAP[event.event_type] || ['club_ai'];
  }

  // Check autonomy for user-scoped events
  const processingResults: Array<{ agent: string; action: string; detail?: string }> = [];

  if (event.user_id) {
    const { data: autonomySettings } = await supabase
      .from('agent_autonomy_settings')
      .select('action_type, autonomy_level')
      .eq('user_id', event.user_id);

    const autonomyMap = new Map<string, string>();
    for (const s of autonomySettings || []) {
      autonomyMap.set(s.action_type, s.autonomy_level);
    }

    for (const agent of agents) {
      const level = autonomyMap.get(event.event_type) || autonomyMap.get('general_action') || 'suggest';
      processingResults.push({ agent, action: level, detail: `routed from ${event.event_type}` });
    }
  } else {
    for (const agent of agents) {
      processingResults.push({ agent, action: 'routed', detail: `system event ${event.event_type}` });
    }
  }

  // Mark processed
  await markEventProcessed(supabase, event.id, agents, { results: processingResults });

  // Log to intelligence_action_log
  await supabase.from('intelligence_action_log').insert({
    user_id: event.user_id,
    agent_name: 'intelligence_bus',
    action_type: `route_${event.event_type}`,
    action_data: { event_id: event.id, target_agents: agents },
    status: 'completed',
    correlation_id: correlationId,
    completed_at: new Date().toISOString(),
  });
}

async function markEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
  processedBy: string[],
  results: unknown,
) {
  await supabase
    .from('agent_events')
    .update({
      processed: true,
      processed_by: processedBy,
      processing_results: results,
      locked_by: null,
      locked_at: null,
    })
    .eq('id', eventId);
}

// ===========================================================================
// 2. process_queue
// ===========================================================================

async function processQueue(
  supabase: SupabaseClient,
  config: Record<string, unknown>,
  correlationId: string,
) {
  const queueName = (config.queue as string) || 'intelligence_queue';
  const batchSize = (config.batch_size as number) || 50;
  const lockId = `bus_q_${correlationId}`;

  if (queueName === 'intelligence_queue') {
    return await processIntelligenceQueue(supabase, batchSize, lockId, correlationId);
  } else if (queueName === 'communication_task_queue') {
    return await processCommTaskQueue(supabase, batchSize, lockId, correlationId);
  }

  throw new Error(`Unknown queue: ${queueName}`);
}

async function processIntelligenceQueue(
  supabase: SupabaseClient,
  batchSize: number,
  lockId: string,
  correlationId: string,
) {
  const now = new Date().toISOString();

  // Lock pending items
  const { data: items, error } = await supabase
    .from('intelligence_queue')
    .select('*')
    .eq('status', 'pending')
    .is('locked_by', null)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(`fetch intelligence_queue: ${error.message}`);
  if (!items || items.length === 0) return { queue: 'intelligence_queue', processed: 0, failed: 0 };

  const ids = (items as QueueItem[]).map((i) => i.id);
  await supabase
    .from('intelligence_queue')
    .update({ locked_by: lockId, locked_at: now, status: 'processing' })
    .in('id', ids);

  let processed = 0;
  let failed = 0;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  for (const item of items as QueueItem[]) {
    try {
      // Invoke generate-embeddings for the entity
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          processing_type: item.processing_type,
          metadata: item.metadata,
        }),
      });

      if (!resp.ok) {
        throw new Error(`generate-embeddings ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      }

      await supabase
        .from('intelligence_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
          correlation_id: correlationId,
        })
        .eq('id', item.id);

      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const newAttempts = (item.attempts || 0) + 1;

      if (newAttempts >= 3) {
        await supabase.from('dead_letter_queue').insert({
          source_table: 'intelligence_queue',
          source_id: item.id,
          original_payload: item as unknown as Record<string, unknown>,
          error_message: errMsg,
        });

        await supabase
          .from('intelligence_queue')
          .update({
            status: 'failed',
            last_error: errMsg,
            attempts: newAttempts,
            processed_at: new Date().toISOString(),
            locked_by: null,
            locked_at: null,
          })
          .eq('id', item.id);
      } else {
        await supabase
          .from('intelligence_queue')
          .update({
            status: 'pending',
            last_error: errMsg,
            attempts: newAttempts,
            locked_by: null,
            locked_at: null,
          })
          .eq('id', item.id);
      }

      failed++;
    }
  }

  console.log(`${LOG_PREFIX} intelligence_queue: processed=${processed} failed=${failed}`);
  return { queue: 'intelligence_queue', processed, failed };
}

async function processCommTaskQueue(
  supabase: SupabaseClient,
  batchSize: number,
  lockId: string,
  correlationId: string,
) {
  const now = new Date().toISOString();

  const { data: items, error } = await supabase
    .from('communication_task_queue')
    .select('*')
    .eq('processing_status', 'pending')
    .is('locked_by', null)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(`fetch communication_task_queue: ${error.message}`);
  if (!items || items.length === 0) return { queue: 'communication_task_queue', processed: 0, failed: 0 };

  const ids = (items as CommTaskQueueItem[]).map((i) => i.id);
  await supabase
    .from('communication_task_queue')
    .update({ locked_by: lockId, locked_at: now, processing_status: 'processing' })
    .in('id', ids);

  let processed = 0;
  let failed = 0;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  for (const item of items as CommTaskQueueItem[]) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-communication-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          source_table: item.source_table,
          source_id: item.source_id,
        }),
      });

      if (!resp.ok) {
        throw new Error(`generate-communication-tasks ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      }

      const result = await resp.json();

      await supabase
        .from('communication_task_queue')
        .update({
          processing_status: 'completed',
          result,
          processed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
          correlation_id: correlationId,
        })
        .eq('id', item.id);

      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // communication_task_queue uses a different attempts column pattern —
      // it doesn't have one, so we track via re-inserts to DLQ on repeated failures.
      await supabase.from('dead_letter_queue').insert({
        source_table: 'communication_task_queue',
        source_id: item.id,
        original_payload: item as unknown as Record<string, unknown>,
        error_message: errMsg,
      });

      await supabase
        .from('communication_task_queue')
        .update({
          processing_status: 'failed',
          error_message: errMsg,
          processed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
        })
        .eq('id', item.id);

      failed++;
    }
  }

  console.log(`${LOG_PREFIX} communication_task_queue: processed=${processed} failed=${failed}`);
  return { queue: 'communication_task_queue', processed, failed };
}

// ===========================================================================
// 3. execute_workflow
// ===========================================================================

async function executeWorkflow(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
  correlationId: string,
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const payload = {
    trigger_type: data.trigger_type,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    trigger_event: data.trigger_event,
  };

  console.log(`${LOG_PREFIX} invoking orchestrate-communication-workflow for ${data.entity_type}:${data.entity_id}`);

  const resp = await fetch(`${supabaseUrl}/functions/v1/orchestrate-communication-workflow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = resp.ok ? await resp.json() : { error: (await resp.text()).slice(0, 500) };

  await supabase.from('intelligence_action_log').insert({
    agent_name: 'intelligence_bus',
    action_type: 'execute_workflow',
    action_data: payload,
    status: resp.ok ? 'completed' : 'failed',
    result,
    correlation_id: correlationId,
    completed_at: new Date().toISOString(),
  });

  return { invoked: true, status: resp.status, result };
}

// ===========================================================================
// 4. retry_dlq
// ===========================================================================

async function retryDLQ(supabase: SupabaseClient, correlationId: string) {
  const { data: items, error } = await supabase
    .from('dead_letter_queue')
    .select('*')
    .eq('status', 'retrying')
    .order('next_retry_at', { ascending: true })
    .limit(50);

  if (error) throw new Error(`fetch DLQ: ${error.message}`);
  if (!items || items.length === 0) return { retried: 0, exhausted: 0 };

  let retried = 0;
  let exhausted = 0;

  for (const item of items as DLQItem[]) {
    try {
      // Re-enqueue based on source table
      if (item.source_table === 'agent_events') {
        // Unlock and reset the original event for reprocessing
        await supabase
          .from('agent_events')
          .update({
            processed: false,
            locked_by: null,
            locked_at: null,
            retry_count: 0,
            last_error: null,
            correlation_id: correlationId,
          })
          .eq('id', item.source_id);
      } else if (item.source_table === 'intelligence_queue') {
        await supabase
          .from('intelligence_queue')
          .update({
            status: 'pending',
            locked_by: null,
            locked_at: null,
            attempts: 0,
            last_error: null,
            correlation_id: correlationId,
          })
          .eq('id', item.source_id);
      } else if (item.source_table === 'communication_task_queue') {
        await supabase
          .from('communication_task_queue')
          .update({
            processing_status: 'pending',
            locked_by: null,
            locked_at: null,
            error_message: null,
            correlation_id: correlationId,
          })
          .eq('id', item.source_id);
      }

      await supabase
        .from('dead_letter_queue')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: `Auto-retried by intelligence-bus (correlation: ${correlationId})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      retried++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const newRetryCount = (item.retry_count || 0) + 1;

      if (newRetryCount >= item.max_retries) {
        await supabase
          .from('dead_letter_queue')
          .update({
            status: 'exhausted',
            retry_count: newRetryCount,
            error_message: errMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        exhausted++;
      } else {
        // Exponential backoff: 5min * 2^retry_count
        const backoffMs = DLQ_BASE_DELAY_MS * Math.pow(2, newRetryCount);
        await supabase
          .from('dead_letter_queue')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
            error_message: errMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }
    }
  }

  console.log(`${LOG_PREFIX} DLQ retry: retried=${retried} exhausted=${exhausted}`);
  return { retried, exhausted };
}

// ===========================================================================
// 5. health_check
// ===========================================================================

async function healthCheck(supabase: SupabaseClient) {
  const { data: agents, error } = await supabase
    .from('agent_health')
    .select('*')
    .order('agent_name', { ascending: true });

  if (error) throw new Error(`health_check: ${error.message}`);

  return { agents: agents || [] };
}

// ===========================================================================
// 6. signal
// ===========================================================================

async function sendSignal(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
  correlationId: string,
) {
  const { from_agent, to_agent, signal_type, payload, priority } = data;

  if (!from_agent || !signal_type) {
    throw new Error('signal requires from_agent and signal_type');
  }

  const { data: signal, error } = await supabase
    .from('agent_signals')
    .insert({
      from_agent: from_agent as string,
      to_agent: (to_agent as string) || null,
      signal_type: signal_type as string,
      payload: (payload as Record<string, unknown>) || {},
      correlation_id: correlationId,
      priority: (priority as number) || 5,
    })
    .select()
    .single();

  if (error) throw new Error(`insert signal: ${error.message}`);

  // If signal_type is 'request_action', also create a high-priority agent_event
  if (signal_type === 'request_action') {
    await supabase.from('agent_events').insert({
      event_type: 'signal_request_action',
      event_source: `signal:${from_agent}`,
      entity_type: 'agent_signal',
      entity_id: signal.id,
      event_data: {
        signal_id: signal.id,
        target: to_agent,
        ...(payload as Record<string, unknown> || {}),
      },
      priority: 9, // high priority
      correlation_id: correlationId,
    });
  }

  console.log(`${LOG_PREFIX} signal sent: ${from_agent} -> ${to_agent || 'broadcast'} (${signal_type})`);
  return { signal };
}

// ===========================================================================
// 7. full_cycle
// ===========================================================================

async function fullCycle(
  supabase: SupabaseClient,
  config: Record<string, unknown>,
  correlationId: string,
) {
  const startTime = Date.now();
  const results: Record<string, unknown> = {};
  const errors: Array<{ step: string; error: string }> = [];

  // Step 1: Process event batch
  try {
    results.event_batch = await processEventBatch(
      supabase,
      { batch_size: (config.batch_size as number) || 200 },
      correlationId,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} full_cycle event_batch error: ${msg}`);
    errors.push({ step: 'event_batch', error: msg });
    results.event_batch = { error: msg };
  }

  // Step 2: Process intelligence_queue and communication_task_queue in parallel
  const [iqResult, ctqResult] = await Promise.allSettled([
    processIntelligenceQueue(supabase, 50, `bus_iq_${correlationId}`, correlationId),
    processCommTaskQueue(supabase, 50, `bus_ctq_${correlationId}`, correlationId),
  ]);

  if (iqResult.status === 'fulfilled') {
    results.intelligence_queue = iqResult.value;
  } else {
    const msg = iqResult.reason instanceof Error ? iqResult.reason.message : String(iqResult.reason);
    errors.push({ step: 'intelligence_queue', error: msg });
    results.intelligence_queue = { error: msg };
  }

  if (ctqResult.status === 'fulfilled') {
    results.communication_task_queue = ctqResult.value;
  } else {
    const msg = ctqResult.reason instanceof Error ? ctqResult.reason.message : String(ctqResult.reason);
    errors.push({ step: 'communication_task_queue', error: msg });
    results.communication_task_queue = { error: msg };
  }

  // Step 3: Retry dead letter queue
  try {
    results.dlq = await retryDLQ(supabase, correlationId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({ step: 'dlq', error: msg });
    results.dlq = { error: msg };
  }

  // Step 4: Update agent_health for the bus itself
  try {
    await supabase
      .from('agent_health')
      .update({
        last_heartbeat_at: new Date().toISOString(),
        last_success_at: errors.length === 0 ? new Date().toISOString() : undefined,
        consecutive_failures: errors.length > 0 ? undefined : 0,
        status: errors.length === 0 ? 'healthy' : 'degraded',
        metadata: { last_cycle_duration_ms: Date.now() - startTime, errors_count: errors.length },
        updated_at: new Date().toISOString(),
      })
      .eq('agent_name', 'intelligence_bus');
  } catch {
    // Non-fatal: health update failure should not break the cycle
  }

  const duration = Date.now() - startTime;
  console.log(`${LOG_PREFIX} full_cycle complete in ${duration}ms, errors=${errors.length}`);

  return { duration_ms: duration, results, errors };
}
