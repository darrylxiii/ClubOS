import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const agentsInvoked: string[] = [];
  const results: Record<string, unknown> = {};
  const errors: Array<{ agent: string; error: string }> = [];
  let eventsProcessed = 0;
  let signalsDetected = 0;
  let tasksCreated = 0;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper to invoke sibling edge functions safely
    async function invokeAgent(name: string, body: Record<string, unknown> = {}): Promise<unknown> {
      try {
        agentsInvoked.push(name);
        const resp = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
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
        console.error(`[Heartbeat] ${name} failed:`, message);
        return null;
      }
    }

    // 1. Process pending agent events
    console.log("[Heartbeat] Processing agent events...");
    const eventResult = await invokeAgent("agent-event-processor", {
      operation: "process_events",
    });
    if (eventResult && typeof eventResult === "object" && "processedCount" in eventResult) {
      eventsProcessed = (eventResult as any).processedCount || 0;
    }
    results.events = eventResult;

    // 2. Detect predictive signals
    console.log("[Heartbeat] Detecting predictive signals...");
    const signalResult = await invokeAgent("detect-predictive-signals", {});
    if (signalResult && typeof signalResult === "object" && "signals_detected" in signalResult) {
      signalsDetected = (signalResult as any).signals_detected || 0;
    }
    results.signals = signalResult;

    // 3. Check stalled candidates
    console.log("[Heartbeat] Checking stalled candidates...");
    const stalledResult = await invokeAgent("check-stalled-candidates", {});
    if (stalledResult && typeof stalledResult === "object" && "tasks_created" in stalledResult) {
      tasksCreated += (stalledResult as any).tasks_created || 0;
    }
    results.stalled = stalledResult;

    // 4. Process any job_status_open events → trigger headhunter
    const { data: jobEvents } = await supabase
      .from("agent_events")
      .select("*")
      .eq("event_type", "job_status_open")
      .eq("processed", false)
      .limit(10);

    if (jobEvents && jobEvents.length > 0) {
      console.log(`[Heartbeat] Found ${jobEvents.length} new job-open events, triggering headhunter...`);
      for (const event of jobEvents) {
        const jobId = event.event_data?.job_id;
        if (jobId) {
          const hhResult = await invokeAgent("run-headhunter-agent", { jobId });
          results[`headhunter_${jobId}`] = hhResult;
        }
        // Mark processed
        await supabase
          .from("agent_events")
          .update({ processed: true, processed_by: ["agentic-heartbeat"] })
          .eq("id", event.id);
      }
    }

    // 5. Memory decay (clean up expired working memory)
    console.log("[Heartbeat] Running memory decay...");
    const { error: decayError } = await supabase
      .from("agent_working_memory")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (decayError) {
      errors.push({ agent: "memory_decay", error: decayError.message });
    } else {
      agentsInvoked.push("memory_decay");
    }

    // Log the heartbeat run
    const duration = Date.now() - startTime;
    await supabase.from("agentic_heartbeat_log").insert({
      run_type: "scheduled",
      agents_invoked: agentsInvoked,
      results,
      duration_ms: duration,
      errors: errors.length > 0 ? errors : [],
      events_processed: eventsProcessed,
      signals_detected: signalsDetected,
      tasks_created: tasksCreated,
    });

    console.log(`[Heartbeat] Complete in ${duration}ms. Agents: ${agentsInvoked.length}, Events: ${eventsProcessed}, Signals: ${signalsDetected}`);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        agents_invoked: agentsInvoked,
        events_processed: eventsProcessed,
        signals_detected: signalsDetected,
        tasks_created: tasksCreated,
        errors: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Heartbeat] Fatal error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
