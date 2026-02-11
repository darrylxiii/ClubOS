import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate',
};

const ENRICHMENT_COOLDOWN_HOURS = 24;
const MAX_BATCH_SIZE = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Validate user with anon client
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidate_ids } = await req.json();

    if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'candidate_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (candidate_ids.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_BATCH_SIZE} candidates per batch` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[batch-linkedin-enrich] Processing ${candidate_ids.length} candidates for user ${user.id}`);

    // Fetch candidate profiles
    const { data: candidates, error: fetchError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, linkedin_url, enrichment_last_run, current_title, current_company, skills, years_of_experience, avatar_url')
      .in('id', candidate_ids);

    if (fetchError) {
      console.error('[batch-linkedin-enrich] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch candidates' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ id: string; name: string; status: 'enriched' | 'failed' | 'skipped'; reason?: string; fields_updated?: string[] }> = [];
    let enrichedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const candidate of (candidates || [])) {
      // Skip if no LinkedIn URL
      if (!candidate.linkedin_url) {
        results.push({ id: candidate.id, name: candidate.full_name, status: 'skipped', reason: 'No LinkedIn URL' });
        skippedCount++;
        continue;
      }

      // Skip if enriched within cooldown period
      if (candidate.enrichment_last_run) {
        const lastRun = new Date(candidate.enrichment_last_run);
        const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRun < ENRICHMENT_COOLDOWN_HOURS) {
          results.push({
            id: candidate.id,
            name: candidate.full_name,
            status: 'skipped',
            reason: `Enriched ${Math.round(hoursSinceLastRun)}h ago (cooldown: ${ENRICHMENT_COOLDOWN_HOURS}h)`,
          });
          skippedCount++;
          continue;
        }
      }

      try {
        // Call linkedin-scraper internally (service-to-service)
        const scraperResponse = await fetch(`${supabaseUrl}/functions/v1/linkedin-scraper`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ linkedinUrl: candidate.linkedin_url }),
        });

        if (!scraperResponse.ok) {
          const errorText = await scraperResponse.text();
          console.error(`[batch-linkedin-enrich] Scraper failed for ${candidate.full_name}:`, errorText);
          results.push({ id: candidate.id, name: candidate.full_name, status: 'failed', reason: `Scraper returned ${scraperResponse.status}` });
          failedCount++;
          continue;
        }

        const scraperResult = await scraperResponse.json();

        if (!scraperResult.success || !scraperResult.data) {
          results.push({ id: candidate.id, name: candidate.full_name, status: 'failed', reason: scraperResult.error || 'No data returned' });
          failedCount++;
          continue;
        }

        const data = scraperResult.data;
        const fieldsUpdated: string[] = [];

        // Build null-safe update object — never overwrite manually edited fields
        const updateObj: Record<string, any> = {
          enrichment_last_run: new Date().toISOString(),
          linkedin_profile_data: data.linkedin_profile_data,
          enrichment_data: {
            source: 'linkedin',
            api_used: data.source_metadata?.api_used || 'unknown',
            enriched_at: new Date().toISOString(),
            fields_updated: [] as string[], // filled below
          },
        };

        // Conditionally update fields only if currently empty
        if (!candidate.current_title && data.current_title) {
          updateObj.current_title = data.current_title;
          fieldsUpdated.push('current_title');
        }
        if (!candidate.current_company && data.current_company) {
          updateObj.current_company = data.current_company;
          fieldsUpdated.push('current_company');
        }
        if ((!candidate.years_of_experience || candidate.years_of_experience === 0) && data.years_of_experience) {
          updateObj.years_of_experience = data.years_of_experience;
          fieldsUpdated.push('years_of_experience');
        }
        if (!candidate.avatar_url && data.avatar_url) {
          updateObj.avatar_url = data.avatar_url;
          fieldsUpdated.push('avatar_url');
        }

        // Merge skills (no duplicates)
        if (data.skills && data.skills.length > 0) {
          const existingSkills = (candidate.skills as string[]) || [];
          const merged = [...new Set([...existingSkills, ...data.skills])];
          if (merged.length > existingSkills.length) {
            updateObj.skills = merged;
            fieldsUpdated.push('skills');
          }
        }

        // Always update structured data
        if (data.work_history && data.work_history.length > 0) {
          updateObj.work_history = data.work_history;
          fieldsUpdated.push('work_history');
        }
        if (data.education && data.education.length > 0) {
          updateObj.education = data.education;
          fieldsUpdated.push('education');
        }
        if (data.ai_summary) {
          updateObj.ai_summary = data.ai_summary;
          fieldsUpdated.push('ai_summary');
        }

        updateObj.enrichment_data.fields_updated = fieldsUpdated;

        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update(updateObj)
          .eq('id', candidate.id);

        if (updateError) {
          console.error(`[batch-linkedin-enrich] Update failed for ${candidate.full_name}:`, updateError);
          results.push({ id: candidate.id, name: candidate.full_name, status: 'failed', reason: 'Database update failed' });
          failedCount++;
          continue;
        }

        results.push({ id: candidate.id, name: candidate.full_name, status: 'enriched', fields_updated: fieldsUpdated });
        enrichedCount++;

      } catch (err) {
        console.error(`[batch-linkedin-enrich] Error for ${candidate.full_name}:`, err);
        results.push({ id: candidate.id, name: candidate.full_name, status: 'failed', reason: err instanceof Error ? err.message : 'Unknown error' });
        failedCount++;
      }
    }

    console.log(`[batch-linkedin-enrich] Done: ${enrichedCount} enriched, ${failedCount} failed, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        total: candidates?.length || 0,
        enriched: enrichedCount,
        failed: failedCount,
        skipped: skippedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[batch-linkedin-enrich] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
