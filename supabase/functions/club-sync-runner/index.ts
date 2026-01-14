import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface ClubSyncCandidate {
  id: string;
  full_name: string;
  email: string;
  club_sync_enabled: boolean;
}

interface MatchingJob {
  id: string;
  title: string;
  company_id: string;
  match_score: number;
  match_factors: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[club-sync-runner] Starting Club Sync auto-apply job");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional request body for manual trigger
    let manualCandidateId: string | null = null;
    let minMatchScore = 90; // Default threshold for Elite Match
    
    try {
      const body = await req.json();
      manualCandidateId = body?.candidateId || null;
      minMatchScore = body?.minMatchScore || 90;
    } catch {
      // No body provided, run for all eligible candidates
    }

    // 1. Get all candidates with club_sync_enabled = true
    let candidatesQuery = supabase
      .from("profiles")
      .select("id, full_name, email, club_sync_enabled")
      .eq("club_sync_enabled", true);

    if (manualCandidateId) {
      candidatesQuery = candidatesQuery.eq("id", manualCandidateId);
    }

    const { data: candidates, error: candidatesError } = await candidatesQuery;

    if (candidatesError) {
      console.error("[club-sync-runner] Error fetching candidates:", candidatesError);
      throw candidatesError;
    }

    console.log(`[club-sync-runner] Found ${candidates?.length || 0} candidates with Club Sync enabled`);

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No candidates with Club Sync enabled",
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get active jobs
    const { data: activeJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, company_id")
      .eq("status", "published");

    if (jobsError) {
      console.error("[club-sync-runner] Error fetching jobs:", jobsError);
      throw jobsError;
    }

    console.log(`[club-sync-runner] Found ${activeJobs?.length || 0} active jobs`);

    let applicationsCreated = 0;
    let applicationsSkipped = 0;
    const results: Array<{ candidateId: string; jobId: string; status: string; matchScore?: number }> = [];

    // 3. For each candidate, find matching jobs and auto-apply
    for (const candidate of candidates as ClubSyncCandidate[]) {
      console.log(`[club-sync-runner] Processing candidate: ${candidate.full_name} (${candidate.id})`);

      // Get existing applications for this candidate
      const { data: existingApplications } = await supabase
        .from("applications")
        .select("job_id")
        .eq("candidate_id", candidate.id);

      const appliedJobIds = new Set(existingApplications?.map(app => app.job_id) || []);

      // Get match scores for this candidate
      const { data: matchScores } = await supabase
        .from("match_scores")
        .select("job_id, overall_score, match_factors")
        .eq("candidate_id", candidate.id)
        .gte("overall_score", minMatchScore);

      if (!matchScores || matchScores.length === 0) {
        console.log(`[club-sync-runner] No high-match jobs found for ${candidate.full_name}`);
        continue;
      }

      // Filter out already applied jobs
      const eligibleMatches = matchScores.filter(match => !appliedJobIds.has(match.job_id));

      console.log(`[club-sync-runner] Found ${eligibleMatches.length} eligible matches for ${candidate.full_name}`);

      // Auto-apply to each eligible job
      for (const match of eligibleMatches) {
        const job = activeJobs?.find(j => j.id === match.job_id);
        if (!job) continue;

        try {
          // Create application
          const { data: application, error: appError } = await supabase
            .from("applications")
            .insert({
              job_id: match.job_id,
              candidate_id: candidate.id,
              status: "applied",
              application_source: "club_sync",
              match_score: match.overall_score,
              match_factors: match.match_factors,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (appError) {
            console.error(`[club-sync-runner] Error creating application for ${candidate.full_name} -> ${job.title}:`, appError);
            results.push({ candidateId: candidate.id, jobId: match.job_id, status: "error" });
            continue;
          }

          // Log to candidate_application_logs
          await supabase.from("candidate_application_logs").insert({
            candidate_profile_id: candidate.id,
            action: "club_sync_auto_apply",
            details: {
              job_id: match.job_id,
              job_title: job.title,
              match_score: match.overall_score,
              application_id: application.id,
              auto_applied_at: new Date().toISOString(),
            },
          });

          console.log(`[club-sync-runner] Auto-applied ${candidate.full_name} to ${job.title} (${match.overall_score}% match)`);
          results.push({ 
            candidateId: candidate.id, 
            jobId: match.job_id, 
            status: "applied",
            matchScore: match.overall_score 
          });
          applicationsCreated++;
        } catch (error) {
          console.error(`[club-sync-runner] Unexpected error:`, error);
          results.push({ candidateId: candidate.id, jobId: match.job_id, status: "error" });
        }
      }
    }

    console.log(`[club-sync-runner] Job complete. Applications created: ${applicationsCreated}`);

    return new Response(
      JSON.stringify({
        success: true,
        candidatesProcessed: candidates.length,
        applicationsCreated,
        applicationsSkipped,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[club-sync-runner] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
