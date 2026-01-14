import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    console.log("[Club Pilot] Starting orchestration for user:", user.id);

    // Get user preferences or use defaults
    const { data: preferences } = await supabase
      .from("pilot_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const prefs = preferences || {
      work_hours_start: "09:00",
      work_hours_end: "17:00",
      working_days: [1, 2, 3, 4, 5],
      max_tasks_per_day: 8,
      auto_schedule_enabled: true,
      buffer_minutes: 15,
      break_between_tasks_minutes: 15,
    };

    // Fetch pending applications that need review
    const { data: applications } = await supabase
      .from("applications")
      .select(`
        id,
        position,
        company_name,
        status,
        applied_at,
        current_stage_index,
        stages,
        candidate_full_name,
        match_score
      `)
      .eq("user_id", user.id)
      .in("status", ["applied", "screening", "interviewing"])
      .order("applied_at", { ascending: false })
      .limit(20);

    // Fetch upcoming interviews
    const { data: interviews } = await supabase
      .from("quantum_meetings")
      .select("*")
      .eq("organizer_id", user.id)
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true });

    // Fetch existing pending tasks
    const { data: existingTasks } = await supabase
      .from("pilot_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .is("scheduled_start", null);

    console.log("[Club Pilot] Found:", {
      applications: applications?.length || 0,
      interviews: interviews?.length || 0,
      existingTasks: existingTasks?.length || 0,
    });

    // Generate task suggestions using AI
    const taskContext = {
      applications: applications || [],
      interviews: interviews || [],
      existingTasks: existingTasks || [],
      preferences: prefs,
    };

    const systemPrompt = `You are Club Pilot, an AI task orchestrator for The Quantum Club recruitment platform.
Your job is to analyze the user's recruitment pipeline and suggest high-priority tasks.

Priority Calculation Formula:
- Impact (0.35): How much does this task move the needle? (0-10)
- Urgency (0.20): Time sensitivity (0-10)
- Due Date (0.20): Days until deadline affects priority (0-10)
- Role Value (0.20): Importance of the role/candidate (0-10)
- Effort (0.03): Minutes required (subtract, lower is better)
- Load (0.02): Current task count (subtract, lower is better)

Task Types:
- review_candidate: New applications that need screening
- schedule_interview: Qualified candidates ready for interview
- prepare_interview: Upcoming interviews needing prep
- send_update: Candidates waiting for response > 3 days
- follow_up: Post-interview follow-ups
- review_application: Applications in screening stage
- send_offer: Candidates in final stage

Return actionable tasks with clear next steps and AI rationale.`;

    const userPrompt = `Analyze this recruitment pipeline and suggest 5-8 high-priority tasks:

Applications: ${JSON.stringify(taskContext.applications, null, 2)}
Interviews: ${JSON.stringify(taskContext.interviews, null, 2)}
Existing Tasks: ${JSON.stringify(taskContext.existingTasks, null, 2)}

User Preferences:
- Work hours: ${prefs.work_hours_start} - ${prefs.work_hours_end}
- Max tasks per day: ${prefs.max_tasks_per_day}
- Auto-scheduling: ${prefs.auto_schedule_enabled ? "enabled" : "disabled"}

For each suggested task, calculate the priority score and explain why it matters.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_pilot_tasks",
              description: "Create prioritized tasks for the user's recruitment pipeline",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task_type: {
                          type: "string",
                          enum: ["review_candidate", "schedule_interview", "prepare_interview", "send_update", "follow_up", "review_application", "send_offer"],
                        },
                        title: { type: "string" },
                        description: { type: "string" },
                        priority_score: { type: "number" },
                        impact_score: { type: "number" },
                        urgency_score: { type: "number" },
                        effort_minutes: { type: "number" },
                        ai_recommendation: { type: "string" },
                        related_entity_type: { type: "string" },
                        related_entity_id: { type: "string" },
                        context: { type: "object" },
                      },
                      required: ["task_type", "title", "priority_score", "ai_recommendation"],
                    },
                  },
                },
                required: ["tasks"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_pilot_tasks" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[Club Pilot] AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No task suggestions received from AI");
    }

    const suggestedTasks = JSON.parse(toolCall.function.arguments).tasks;
    console.log("[Club Pilot] AI suggested", suggestedTasks.length, "tasks");

    // Insert tasks into database
    const tasksToInsert = suggestedTasks.map((task: any) => ({
      user_id: user.id,
      task_type: task.task_type,
      title: task.title,
      description: task.description || "",
      priority_score: task.priority_score,
      impact_score: task.impact_score || 5,
      urgency_score: task.urgency_score || 5,
      effort_minutes: task.effort_minutes || 15,
      ai_recommendation: task.ai_recommendation,
      related_entity_type: task.related_entity_type || null,
      related_entity_id: task.related_entity_id || null,
      context: task.context || {},
      status: "pending",
    }));

    const { data: insertedTasks, error: insertError } = await supabase
      .from("pilot_tasks")
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error("[Club Pilot] Error inserting tasks:", insertError);
      throw insertError;
    }

    // Auto-schedule tasks if enabled
    let scheduledCount = 0;
    if (prefs.auto_schedule_enabled && insertedTasks) {
      // Call the scheduling function
      const scheduleResponse = await fetch(
        `${supabaseUrl}/functions/v1/schedule-pilot-tasks`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskIds: insertedTasks.map((t: any) => t.id) }),
        }
      );

      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        scheduledCount = scheduleData.scheduled_count || 0;
      }
    }

    // Update metrics
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("pilot_metrics")
      .upsert({
        user_id: user.id,
        date: today,
        tasks_scheduled: scheduledCount,
      }, {
        onConflict: "user_id,date",
      });

    console.log("[Club Pilot] Successfully created", insertedTasks?.length, "tasks");

    return new Response(
      JSON.stringify({
        success: true,
        tasks_created: insertedTasks?.length || 0,
        tasks_scheduled: scheduledCount,
        tasks: insertedTasks,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Club Pilot] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
