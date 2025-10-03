import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get user's tasks, preferences, and calendar events
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .is("scheduled_start", null)
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false });

    if (tasksError) throw tasksError;

    const { data: preferences } = await supabase
      .from("task_scheduling_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get calendar events from connected calendars
    const savedCalendars = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    // Build prompt for AI scheduler
    const systemPrompt = `You are an intelligent task scheduler similar to Motion.app. 
Your job is to analyze the user's tasks, their calendar events, and their preferences to create an optimal daily schedule.

Consider:
- Task priorities (urgent > high > medium > low)
- Due dates (tasks due soon should be scheduled first)
- Estimated duration for each task
- User's working hours and preferences
- Break times between tasks
- Existing calendar events (busy times)
- Focus time blocks

Return a schedule that maximizes productivity while respecting the user's preferences and constraints.`;

    const userPrompt = `Schedule the following tasks:
${JSON.stringify(tasks, null, 2)}

User preferences:
${JSON.stringify(preferences || {
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  working_days: [1, 2, 3, 4, 5],
  break_between_tasks_minutes: 15,
  max_tasks_per_day: 8,
}, null, 2)}

Create an optimal schedule for the next 7 days. For each task, suggest a start time and end time based on its estimated duration.`;

    // Call Lovable AI for intelligent scheduling
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
              name: "schedule_tasks",
              description: "Schedule tasks with optimal start and end times",
              parameters: {
                type: "object",
                properties: {
                  scheduled_tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task_id: { type: "string" },
                        scheduled_start: { type: "string", format: "date-time" },
                        scheduled_end: { type: "string", format: "date-time" },
                        reasoning: { type: "string" },
                      },
                      required: ["task_id", "scheduled_start", "scheduled_end"],
                    },
                  },
                },
                required: ["scheduled_tasks"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "schedule_tasks" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No scheduling suggestions received from AI");
    }

    const scheduledTasks = JSON.parse(toolCall.function.arguments).scheduled_tasks;

    // Update tasks with scheduled times
    const updates = [];
    for (const scheduled of scheduledTasks) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          scheduled_start: scheduled.scheduled_start,
          scheduled_end: scheduled.scheduled_end,
          auto_scheduled: true,
        })
        .eq("id", scheduled.task_id)
        .eq("user_id", user.id);

      if (!updateError) {
        updates.push({ ...scheduled, success: true });
      } else {
        updates.push({ ...scheduled, success: false, error: updateError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        scheduled_count: updates.filter(u => u.success).length,
        updates 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error scheduling tasks:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});