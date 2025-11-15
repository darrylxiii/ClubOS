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

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { taskIds } = await req.json();

    console.log("[Schedule Pilot Tasks] Scheduling", taskIds?.length || 0, "tasks");

    // Get user preferences
    const { data: preferences } = await supabase
      .from("pilot_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const prefs = preferences || {
      work_hours_start: "09:00",
      work_hours_end: "17:00",
      working_days: [1, 2, 3, 4, 5],
      buffer_minutes: 15,
      break_between_tasks_minutes: 15,
      max_tasks_per_day: 8,
    };

    // Get tasks to schedule (sorted by priority)
    const { data: tasks } = await supabase
      .from("pilot_tasks")
      .select("*")
      .eq("user_id", user.id)
      .in("id", taskIds || [])
      .eq("status", "pending")
      .is("scheduled_start", null)
      .order("priority_score", { ascending: false });

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, scheduled_count: 0, message: "No tasks to schedule" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing scheduled tasks to avoid conflicts
    const { data: scheduledTasks } = await supabase
      .from("pilot_tasks")
      .select("scheduled_start, scheduled_end")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .not("scheduled_start", "is", null)
      .not("scheduled_end", "is", null);

    // Simple scheduling algorithm: find next available slots
    const scheduledSlots = scheduledTasks?.map(t => ({
      start: new Date(t.scheduled_start!),
      end: new Date(t.scheduled_end!),
    })) || [];

    const updates = [];
    const now = new Date();
    let currentDate = new Date(now);
    currentDate.setHours(parseInt(prefs.work_hours_start.split(":")[0]), parseInt(prefs.work_hours_start.split(":")[1]), 0, 0);

    // If current time is past work hours, start tomorrow
    const workEnd = new Date(now);
    workEnd.setHours(parseInt(prefs.work_hours_end.split(":")[0]), parseInt(prefs.work_hours_end.split(":")[1]), 0, 0);
    if (now > workEnd) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const task of tasks) {
      // Find next available slot
      let slotFound = false;
      let attempts = 0;
      const maxAttempts = 14; // Look ahead 2 weeks

      while (!slotFound && attempts < maxAttempts) {
        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
        
        // Check if this is a working day
        if (!prefs.working_days.includes(dayOfWeek)) {
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(parseInt(prefs.work_hours_start.split(":")[0]), parseInt(prefs.work_hours_start.split(":")[1]), 0, 0);
          attempts++;
          continue;
        }

        const taskStart = new Date(currentDate);
        const taskEnd = new Date(taskStart.getTime() + (task.effort_minutes || 15) * 60 * 1000);

        // Check if task fits within work hours
        const dayWorkEnd = new Date(currentDate);
        dayWorkEnd.setHours(parseInt(prefs.work_hours_end.split(":")[0]), parseInt(prefs.work_hours_end.split(":")[1]), 0, 0);

        if (taskEnd > dayWorkEnd) {
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(parseInt(prefs.work_hours_start.split(":")[0]), parseInt(prefs.work_hours_start.split(":")[1]), 0, 0);
          attempts++;
          continue;
        }

        // Check for conflicts with existing scheduled tasks
        const hasConflict = scheduledSlots.some(slot => 
          (taskStart >= slot.start && taskStart < slot.end) ||
          (taskEnd > slot.start && taskEnd <= slot.end) ||
          (taskStart <= slot.start && taskEnd >= slot.end)
        );

        if (!hasConflict) {
          // Schedule the task
          const { error: updateError } = await supabase
            .from("pilot_tasks")
            .update({
              scheduled_start: taskStart.toISOString(),
              scheduled_end: taskEnd.toISOString(),
              auto_scheduled_at: new Date().toISOString(),
              status: "scheduled",
            })
            .eq("id", task.id)
            .eq("user_id", user.id);

          if (!updateError) {
            updates.push({ task_id: task.id, scheduled_start: taskStart, scheduled_end: taskEnd });
            scheduledSlots.push({ start: taskStart, end: taskEnd });
            slotFound = true;

            // Move cursor to end of this task + buffer
            currentDate = new Date(taskEnd.getTime() + prefs.break_between_tasks_minutes * 60 * 1000);
          }
        } else {
          // Try next 15-minute slot
          currentDate.setMinutes(currentDate.getMinutes() + 15);
        }

        attempts++;
      }

      if (!slotFound) {
        console.log("[Schedule Pilot Tasks] Could not find slot for task:", task.id);
      }
    }

    console.log("[Schedule Pilot Tasks] Scheduled", updates.length, "tasks");

    return new Response(
      JSON.stringify({
        success: true,
        scheduled_count: updates.length,
        scheduled_tasks: updates,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Schedule Pilot Tasks] Error:", error);
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
