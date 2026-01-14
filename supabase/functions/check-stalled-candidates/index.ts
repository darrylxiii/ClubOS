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
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Define "Stalled" criteria
        // Updated > 7 days ago, Status is active (not rejected/hired/archived)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch stalled applications
        // Note: 'neq' or 'not.in' would be better but simple logic first
        const { data: applications, error: appError } = await supabase
            .from("applications")
            .select("id, status, updated_at, candidate_full_name, position, company_name, job_id, current_stage_index, stages")
            .lt("updated_at", sevenDaysAgo)
            .not("status", "in", '("rejected","hired","archived","withdrawn")')
            .order("updated_at", { ascending: true })
            .limit(50); // Process in batches to avoid timeout

        if (appError) throw appError;

        if (!applications || applications.length === 0) {
            return new Response(JSON.stringify({ message: "No stalled applications found." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const tasksCreated = [];

        // 2. Create Tasks for Stalled Candidates
        for (const app of applications) {
            // Check if task already exists
            const { count: taskCount } = await supabase
                .from("pilot_tasks")
                .select("*", { count: "exact", head: true })
                .eq("source_id", app.id)
                .eq("task_type", "candidate_review")
                .eq("status", "pending");

            if (taskCount === 0) {
                // Safe check for stage name
                let stageName = "Unknown Stage";
                if (Array.isArray(app.stages) && app.stages[app.current_stage_index]) {
                    // Assuming stages is array of objects { name: string } or similar, or just strings
                    const stage = app.stages[app.current_stage_index];
                    stageName = typeof stage === 'string' ? stage : (stage.name || "Unknown Stage");
                }

                const taskData = {
                    title: `Stalled Candidate Alert: ${app.candidate_full_name}`,
                    description: `${app.candidate_full_name} applied for ${app.position} at ${app.company_name} and has been stuck in "${stageName}" since ${new Date(app.updated_at).toLocaleDateString()}. Please review or update status.`,
                    task_type: "candidate_review",
                    priority: "high", // Revenue protection is high priority
                    status: "pending",
                    source_type: "application",
                    source_id: app.id,
                    metadata: {
                        job_id: app.job_id,
                        days_stalled: Math.floor((Date.now() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
                        action_required: "review_candidate"
                    }
                };

                const { data: newTask, error: taskError } = await supabase
                    .from("pilot_tasks")
                    .insert(taskData)
                    .select()
                    .single();

                if (!taskError) {
                    tasksCreated.push(newTask);
                    console.log(`Created alert for application ${app.id}`);
                } else {
                    console.error("Failed to create task:", taskError);
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                stalled_count: applications.length,
                tasks_created: tasksCreated.length,
                tasks: tasksCreated
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
