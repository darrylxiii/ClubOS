import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const startTime = Date.now();
  const supabase = ctx.supabase;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Parse request body for force flag
  let forceRun = false;
  try {
    const body = await req.json();
    forceRun = body?.force === true;
  } catch { /* no body is fine */ }

  // === GUARD CLAUSE: Skip if no pending work ===
  if (!forceRun) {
    const { count: pendingEvents } = await supabase
      .from("agent_events")
      .select("id", { count: "exact", head: true })
      .eq("processed", false);

    const { count: pendingMissions } = await supabase
      .from("sourcing_missions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: pendingIntelQueue } = await supabase
      .from("intelligence_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: pendingCommTasks } = await supabase
      .from("communication_task_queue")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "pending");

    const totalPending = (pendingEvents || 0) + (pendingMissions || 0) +
      (pendingIntelQueue || 0) + (pendingCommTasks || 0);

    if (totalPending === 0) {
      console.log("[Heartbeat] No-op: no pending work. Skipping.");
      await supabase.from("agentic_heartbeat_log").insert({
        run_type: "scheduled_noop",
        agents_invoked: [],
        results: { skipped: true, reason: "no_pending_work" },
        duration_ms: Date.now() - startTime,
        errors: [],
        events_processed: 0,
        signals_detected: 0,
        tasks_created: 0,
      });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "no_pending_work" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // === DELEGATE TO INTELLIGENCE BUS ===
  console.log("[Heartbeat] Delegating to intelligence-bus full_cycle...");

  let busResult: any = null;
  let busError: string | null = null;

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/intelligence-bus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        operation: "full_cycle",
        config: { batch_size: 200, force: forceRun },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      busError = `intelligence-bus returned ${resp.status}: ${text.slice(0, 500)}`;
      console.error(`[Heartbeat] Bus error: ${busError}`);
    } else {
      busResult = await resp.json();
    }
  } catch (err: unknown) {
    busError = err instanceof Error ? err.message : String(err);
    console.error(`[Heartbeat] Bus invocation failed:`, busError);
  }

  // === FALLBACK: Run critical tasks directly if bus fails ===
  if (busError) {
    console.log("[Heartbeat] Falling back to direct agent invocation...");
    busResult = await runFallbackCycle(supabaseUrl, supabaseServiceKey, supabase);
  }

  // === LOG HEARTBEAT ===
  const duration = Date.now() - startTime;
  const eventsProcessed = busResult?.events_processed || 0;
  const signalsDetected = busResult?.signals_detected || 0;
  const tasksCreated = busResult?.tasks_created || 0;

  await supabase.from("agentic_heartbeat_log").insert({
    run_type: forceRun ? "manual" : "scheduled",
    agents_invoked: busResult?.agents_invoked || ["intelligence-bus"],
    results: { bus_result: busResult, bus_error: busError },
    duration_ms: duration,
    errors: busError ? [{ agent: "intelligence-bus", error: busError }] : [],
    events_processed: eventsProcessed,
    signals_detected: signalsDetected,
    tasks_created: tasksCreated,
  });

  console.log(`[Heartbeat] Complete in ${duration}ms. Events: ${eventsProcessed}, Signals: ${signalsDetected}`);

  return new Response(
    JSON.stringify({
      success: true,
      duration_ms: duration,
      delegated_to: busError ? "fallback" : "intelligence-bus",
      events_processed: eventsProcessed,
      signals_detected: signalsDetected,
      tasks_created: tasksCreated,
      bus_error: busError,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}));

/**
 * Fallback: run critical agents directly if the intelligence bus is unavailable.
 * This ensures the system doesn't stop working if the bus has a bug.
 */
async function runFallbackCycle(
  supabaseUrl: string,
  serviceKey: string,
  supabase: any
): Promise<any> {
  const agentsInvoked: string[] = [];
  const errors: Array<{ agent: string; error: string }> = [];
  let eventsProcessed = 0;

  async function invokeAgent(name: string, body: Record<string, unknown> = {}): Promise<unknown> {
    try {
      agentsInvoked.push(name);
      const resp = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`${resp.status}: ${text.slice(0, 200)}`);
      }
      return await resp.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ agent: name, error: message });
      console.error(`[Heartbeat/fallback] ${name} failed:`, message);
      return null;
    }
  }

  // Process agent events
  const eventResult = await invokeAgent("agent-event-processor", { operation: "process_events" });
  if (eventResult && typeof eventResult === "object" && "processedCount" in eventResult) {
    eventsProcessed = (eventResult as any).processedCount || 0;
  }

  // Detect predictive signals
  await invokeAgent("detect-predictive-signals", {});

  // Check stalled candidates
  await invokeAgent("check-stalled-candidates", {});

  // Clean expired working memory
  await supabase
    .from("agent_working_memory")
    .delete()
    .lt("expires_at", new Date().toISOString());

  return {
    agents_invoked: agentsInvoked,
    events_processed: eventsProcessed,
    signals_detected: 0,
    tasks_created: 0,
    errors,
    fallback: true,
  };
}
