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

        // 1. Find recent completed meetings (ended > 1h ago, within last 24h)
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const { data: bookings, error: bookingsError } = await supabase
            .from("bookings")
            .select("id, scheduled_start, scheduled_end, candidate_id, guest_name, job_id, interview_type")
            .eq("status", "confirmed")
            .lt("scheduled_end", oneHourAgo)
            .gt("scheduled_end", twentyFourHoursAgo)
            .is("no_show", null); // Assuming no_show is null or false if attended (checking null first)

        if (bookingsError) throw bookingsError;

        if (!bookings || bookings.length === 0) {
            return new Response(JSON.stringify({ message: "No recent meetings found to check." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const tasksCreated = [];

        // 2. Check for missing data
        for (const booking of bookings) {
            if (!booking.candidate_id) continue;

            // Check for communication data around the meeting time (+/- 2 hours)
            const meetingStart = new Date(booking.scheduled_start);
            const searchStart = new Date(meetingStart.getTime() - 2 * 60 * 60 * 1000).toISOString();
            const searchEnd = new Date(meetingStart.getTime() + 4 * 60 * 60 * 1000).toISOString(); // +4h to cover duration + buffer

            const { count, error: commsError } = await supabase
                .from("unified_communications")
                .select("*", { count: "exact", head: true })
                .eq("entity_id", booking.candidate_id)
                .gte("original_timestamp", searchStart)
                .lte("original_timestamp", searchEnd);

            if (commsError) {
                console.error(`Error checking comms for booking ${booking.id}:`, commsError);
                continue;
            }

            // If no data found (count === 0), create a task
            if (count === 0) {
                // Double check checks: Avoid duplicate tasks
                const { count: taskCount } = await supabase
                    .from("pilot_tasks")
                    .select("*", { count: "exact", head: true })
                    .eq("source_id", booking.id)
                    .eq("task_type", "data_entry_required");

                if (taskCount === 0) {
                    const taskData = {
                        title: `Missing Data: ${booking.interview_type || 'Meeting'} with ${booking.guest_name}`,
                        description: `The meeting ended at ${new Date(booking.scheduled_end).toLocaleTimeString()} but no recording, transcript, or notes have been uploaded. Please ensure data integrity.`,
                        task_type: "data_entry_required",
                        priority: "medium", // Or high depending on policy
                        status: "pending",
                        source_type: "booking",
                        source_id: booking.id, // Link to booking
                        metadata: {
                            candidate_id: booking.candidate_id,
                            job_id: booking.job_id,
                            action_required: "upload_meeting_data"
                        }
                    };

                    const { data: newTask, error: taskError } = await supabase
                        .from("pilot_tasks")
                        .insert(taskData)
                        .select()
                        .single();

                    if (!taskError) {
                        tasksCreated.push(newTask);
                        console.log(`Created task for booking ${booking.id}`);
                    } else {
                        console.error("Failed to create task:", taskError);
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                checked_bookings: bookings.length,
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
