import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json();

    // This function can be called via DB webhook on pipeline_events INSERT
    // or directly with a pipeline_event payload
    const event = body.record || body;
    const { id: eventId, job_id, event_type, from_stage, to_stage, performed_by, metadata } = event;

    if (!job_id || !event_type) {
      return new Response(JSON.stringify({ error: "Missing job_id or event_type" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load active automations for this job
    const { data: automations, error: autoError } = await supabase
      .from("pipeline_automations")
      .select("*")
      .eq("job_id", job_id)
      .eq("is_active", true);

    if (autoError) throw autoError;
    if (!automations || automations.length === 0) {
      return new Response(JSON.stringify({ message: "No active automations", matched: 0 }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    let matched = 0;

    for (const automation of automations) {
      const triggered = evaluateTrigger(automation, event);
      if (!triggered) continue;

      matched++;
      let status: "success" | "failed" = "success";
      let resultData: Record<string, unknown> = {};
      let errorMessage: string | null = null;

      try {
        resultData = await executeAction(supabase, automation, event);

        // Update trigger count
        await supabase
          .from("pipeline_automations")
          .update({
            trigger_count: automation.trigger_count + 1,
            last_triggered_at: new Date().toISOString(),
          })
          .eq("id", automation.id);
      } catch (err) {
        status = "failed";
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      // Log execution
      await supabase.from("pipeline_automation_logs").insert({
        automation_id: automation.id,
        pipeline_event_id: eventId || null,
        status,
        trigger_data: { event_type, from_stage, to_stage, metadata },
        result_data: resultData,
        error_message: errorMessage,
      });
    }

    return new Response(
      JSON.stringify({ message: `Processed ${matched} automation(s)`, matched }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Pipeline automation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateTrigger(automation: any, event: any): boolean {
  const { trigger_type, trigger_config } = automation;
  const { event_type, from_stage, to_stage } = event;

  if (trigger_type !== event_type) return false;

  // Stage change specific config
  if (trigger_type === "stage_change" && trigger_config) {
    if (trigger_config.from_stage !== undefined && trigger_config.from_stage !== from_stage) return false;
    if (trigger_config.to_stage !== undefined && trigger_config.to_stage !== to_stage) return false;
  }

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAction(supabase: any, automation: any, event: any): Promise<Record<string, unknown>> {
  const { action_type, action_config, job_id } = automation;
  const { application_id, performed_by } = event;

  // Fetch context for template variables
  const [appResult, jobResult] = await Promise.all([
    application_id
      ? supabase.from("applications").select("*, candidate_profiles(full_name, email)").eq("id", application_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("jobs").select("title, company_id, companies(name)").eq("id", job_id).maybeSingle(),
  ]);

  const app = appResult.data;
  const job = jobResult.data;
  const candidateName = app?.candidate_profiles?.full_name || "Candidate";
  const candidateEmail = app?.candidate_profiles?.email;
  const jobTitle = job?.title || "Position";
  const companyName = job?.companies?.name || "Company";
  const stages = job?.pipeline_stages || [];
  const stageName = stages[event.to_stage]?.name || `Stage ${event.to_stage}`;

  const interpolate = (text: string) =>
    text
      .replace(/\{\{candidate_name\}\}/g, candidateName)
      .replace(/\{\{job_title\}\}/g, jobTitle)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{stage_name\}\}/g, stageName);

  switch (action_type) {
    case "send_email": {
      if (!candidateEmail || !action_config.subject) {
        return { skipped: true, reason: "No candidate email or subject configured" };
      }
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: candidateEmail,
          subject: interpolate(action_config.subject as string),
          body: interpolate((action_config.body as string) || ""),
        },
      });
      if (error) throw error;
      return { sent_to: candidateEmail, subject: action_config.subject };
    }

    case "send_notification": {
      // Insert notification for the performer (or all team members)
      if (performed_by && action_config.message) {
        await supabase.from("notifications").insert({
          user_id: performed_by,
          title: interpolate(action_config.message as string),
          type: "pipeline_automation",
          metadata: { job_id, application_id, automation_id: automation.id },
        });
      }
      return { notified: performed_by };
    }

    case "create_task": {
      const taskTitle = interpolate((action_config.task_title as string) || `Follow up: ${candidateName}`);
      const { error } = await supabase.from("unified_tasks").insert({
        job_id,
        title: taskTitle,
        status: "pending",
        priority: "medium",
        created_by: performed_by || null,
        metadata: { automation_id: automation.id, application_id },
      });
      if (error) throw error;
      return { task_created: taskTitle };
    }

    case "auto_advance": {
      if (!application_id) return { skipped: true, reason: "No application_id" };
      const currentStage = app?.current_stage_index ?? 0;
      const nextStage = currentStage + 1;
      const { error } = await supabase
        .from("applications")
        .update({ current_stage_index: nextStage })
        .eq("id", application_id);
      if (error) throw error;

      // Log the auto-advance as a pipeline event
      await supabase.from("pipeline_events").insert({
        application_id,
        job_id,
        event_type: "stage_change",
        from_stage: currentStage,
        to_stage: nextStage,
        performed_by: performed_by || "00000000-0000-0000-0000-000000000000",
        metadata: { auto_advanced: true, automation_id: automation.id },
      });
      return { advanced_from: currentStage, advanced_to: nextStage };
    }

    default:
      return { skipped: true, reason: `Unknown action type: ${action_type}` };
  }
}
