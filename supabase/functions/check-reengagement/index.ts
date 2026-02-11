import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find candidates eligible for re-engagement:
    // 1. auto_reengagement_enabled = true
    // 2. Have company history with could_revisit = true and revisit_after <= now
    // 3. OR candidates who were "silver medalists" (reached final stages but weren't hired)
    const { data: revisitCandidates, error: revisitError } = await supabase
      .from("candidate_company_history")
      .select(`
        id,
        candidate_id,
        company_id,
        job_id,
        stage_reached,
        outcome,
        revisit_after,
        notes,
        candidate_profiles!inner(
          id, full_name, email, current_title, 
          auto_reengagement_enabled, assigned_strategist_id,
          talent_tier, data_completeness_score
        )
      `)
      .eq("could_revisit", true)
      .lte("revisit_after", new Date().toISOString())
      .eq("candidate_profiles.auto_reengagement_enabled", true)
      .limit(50);

    if (revisitError) {
      console.error("Error fetching revisit candidates:", revisitError);
    }

    const tasksCreated: string[] = [];

    // For each revisitable candidate, check if any active jobs match
    for (const entry of revisitCandidates || []) {
      const candidate = entry.candidate_profiles as any;
      if (!candidate) continue;

      // Find active jobs at the same company or similar roles
      const { data: matchingJobs } = await supabase
        .from("jobs")
        .select("id, title, companies(name)")
        .eq("status", "published")
        .limit(5);

      if (!matchingJobs?.length) continue;

      // Create a pilot task for the strategist
      const strategistId = candidate.assigned_strategist_id;
      if (!strategistId) continue;

      for (const job of matchingJobs.slice(0, 2)) {
        const companyName = (job.companies as any)?.name || "Unknown";

        // Check if a similar task already exists (avoid duplicates)
        const { data: existingTask } = await supabase
          .from("pilot_tasks")
          .select("id")
          .eq("user_id", strategistId)
          .eq("task_type", "re_engagement")
          .contains("metadata", { candidate_id: candidate.id, job_id: job.id })
          .maybeSingle();

        if (existingTask) continue;

        const { error: taskError } = await supabase
          .from("pilot_tasks")
          .insert({
            user_id: strategistId,
            title: `Re-engage ${candidate.full_name}`,
            description: `${candidate.full_name} (${candidate.current_title || "N/A"}) previously reached "${entry.stage_reached}" stage. New role at ${companyName}: "${job.title}" may be a strong fit. Consider reaching out.`,
            task_type: "re_engagement",
            priority: candidate.talent_tier === "star" ? "high" : "medium",
            status: "pending",
            metadata: {
              candidate_id: candidate.id,
              job_id: job.id,
              company_id: entry.company_id,
              previous_stage: entry.stage_reached,
              previous_outcome: entry.outcome,
              talent_tier: candidate.talent_tier,
              completeness: candidate.data_completeness_score,
            },
          });

        if (!taskError) {
          tasksCreated.push(`${candidate.full_name} → ${job.title}`);
        }
      }
    }

    // Also check for inactive high-value candidates who haven't been contacted recently
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: dormantStars } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, current_title, assigned_strategist_id, talent_tier, last_activity_at")
      .in("talent_tier", ["star", "strong"])
      .eq("auto_reengagement_enabled", true)
      .lt("last_activity_at", thirtyDaysAgo)
      .not("assigned_strategist_id", "is", null)
      .limit(20);

    for (const candidate of dormantStars || []) {
      // Check if task already exists
      const { data: existingTask } = await supabase
        .from("pilot_tasks")
        .select("id")
        .eq("user_id", candidate.assigned_strategist_id!)
        .eq("task_type", "re_engagement")
        .contains("metadata", { candidate_id: candidate.id, type: "dormant_check" })
        .gte("created_at", thirtyDaysAgo)
        .maybeSingle();

      if (existingTask) continue;

      const { error: taskError } = await supabase
        .from("pilot_tasks")
        .insert({
          user_id: candidate.assigned_strategist_id!,
          title: `Check in with ${candidate.full_name}`,
          description: `${candidate.full_name} (${candidate.current_title || "N/A"}) is a ${candidate.talent_tier}-tier candidate who hasn't been active for 30+ days. A quick check-in could keep them engaged.`,
          task_type: "re_engagement",
          priority: candidate.talent_tier === "star" ? "high" : "medium",
          status: "pending",
          metadata: {
            candidate_id: candidate.id,
            type: "dormant_check",
            talent_tier: candidate.talent_tier,
            last_activity: candidate.last_activity_at,
          },
        });

      if (!taskError) {
        tasksCreated.push(`Dormant check: ${candidate.full_name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          revisitCandidatesChecked: revisitCandidates?.length || 0,
          dormantStarsChecked: dormantStars?.length || 0,
          tasksCreated: tasksCreated.length,
          tasks: tasksCreated,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Re-engagement check error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
