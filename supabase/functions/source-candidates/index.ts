import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeLinkedInUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i);
    if (!match) return null;
    return `https://www.linkedin.com/in/${match[1].toLowerCase().replace(/\/+$/, "")}/`;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Role check
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAuthorized = roles?.some((r: { role: string }) =>
      ["admin", "super_admin", "strategist"].includes(r.role)
    );

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { jobId, linkedinUrls, missionId } = await req.json();

    if (!jobId || !linkedinUrls || !Array.isArray(linkedinUrls)) {
      return new Response(
        JSON.stringify({ error: "jobId and linkedinUrls[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize all URLs
    const normalized: { original: string; normalized: string | null }[] = linkedinUrls.map(
      (url: string) => ({ original: url, normalized: normalizeLinkedInUrl(url) })
    );

    const validUrls = normalized.filter((n) => n.normalized !== null);
    const invalidUrls = normalized.filter((n) => n.normalized === null);

    // Deduplicate against existing candidates
    const normalizedSet = validUrls.map((v) => v.normalized!);
    const { data: existingCandidates } = await supabase
      .from("candidate_profiles")
      .select("id, linkedin_url")
      .in("linkedin_url", normalizedSet);

    const existingUrlMap = new Map(
      (existingCandidates || []).map((c) => [c.linkedin_url, c.id])
    );

    const newUrls = validUrls.filter((v) => !existingUrlMap.has(v.normalized!));
    const duplicateUrls = validUrls.filter((v) => existingUrlMap.has(v.normalized!));

    const results = {
      total_submitted: linkedinUrls.length,
      valid: validUrls.length,
      invalid: invalidUrls.length,
      duplicates: duplicateUrls.length,
      new_profiles: newUrls.length,
      processed: [] as { url: string; candidateId: string | null; status: string; error?: string }[],
      errors: [] as { url: string; error: string }[],
    };

    // Process new URLs: invoke linkedin-scraper for each
    for (const item of newUrls) {
      try {
        const scraperResp = await fetch(`${supabaseUrl}/functions/v1/linkedin-scraper`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ linkedinUrl: item.normalized }),
        });

        if (!scraperResp.ok) {
          const errText = await scraperResp.text();
          results.errors.push({ url: item.original, error: `Scraper: ${scraperResp.status} ${errText.slice(0, 100)}` });
          results.processed.push({ url: item.original, candidateId: null, status: "scrape_failed", error: errText.slice(0, 100) });
          continue;
        }

        const scraperData = await scraperResp.json();
        const candidateId = scraperData.candidate_id || scraperData.candidateId;

        if (candidateId) {
          // Trigger enrichment
          try {
            await fetch(`${supabaseUrl}/functions/v1/enrich-candidate-profile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ candidateId }),
            });
          } catch (enrichErr) {
            console.warn(`[source-candidates] Enrichment failed for ${candidateId}:`, enrichErr);
          }

          results.processed.push({ url: item.original, candidateId, status: "scraped_and_enriching" });
        } else {
          results.processed.push({ url: item.original, candidateId: null, status: "scrape_no_id" });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push({ url: item.original, error: msg });
        results.processed.push({ url: item.original, candidateId: null, status: "error", error: msg });
      }
    }

    // Add existing duplicates to processed
    for (const dup of duplicateUrls) {
      results.processed.push({
        url: dup.original,
        candidateId: existingUrlMap.get(dup.normalized!) || null,
        status: "already_exists",
      });
    }

    // Update sourcing mission if provided
    if (missionId) {
      const totalFound = (results.processed.filter((p) => p.status !== "error" && p.status !== "scrape_failed").length);
      const totalNew = newUrls.length - results.errors.length;
      await supabase
        .from("sourcing_missions")
        .update({
          profiles_found: totalFound,
          profiles_new: totalNew,
          status: "completed",
          completed_at: new Date().toISOString(),
          results: results,
        })
        .eq("id", missionId);
    }

    // Log decision
    await supabase.from("agent_decision_log").insert({
      agent_name: "source-candidates",
      decision_type: "bulk_url_import",
      decision_made: `Processed ${linkedinUrls.length} URLs for job ${jobId}: ${newUrls.length} new, ${duplicateUrls.length} existing`,
      confidence_score: 0.9,
      context_used: { job_id: jobId, mission_id: missionId },
      affected_entities: { job_id: jobId, urls_count: linkedinUrls.length },
      user_id: userId,
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[source-candidates] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
