import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { candidateId } = await req.json();
    if (!candidateId) throw new Error('candidateId is required');

    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    if (!APIFY_API_KEY) throw new Error('APIFY_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate
    const { data: candidate, error: fetchErr } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, github_username, github_url, linkedin_profile_data, enrichment_sources')
      .eq('id', candidateId)
      .single();

    if (fetchErr || !candidate) throw new Error('Candidate not found');

    // Determine GitHub username
    let username = candidate.github_username;
    if (!username && candidate.github_url) {
      const match = candidate.github_url.match(/github\.com\/([^\/\?#]+)/i);
      if (match) username = match[1];
    }
    if (!username && candidate.linkedin_profile_data?.github) {
      username = candidate.linkedin_profile_data.github;
    }
    // Try email prefix as last resort
    if (!username && candidate.email) {
      const prefix = candidate.email.split('@')[0];
      // Only try if prefix looks like a plausible username
      if (/^[a-zA-Z0-9_-]+$/.test(prefix)) {
        username = prefix;
      }
    }

    if (!username) {
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'No GitHub username found',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[enrich-github] Scraping GitHub for username: ${username}`);

    // Use Apify GitHub scraper
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/natasha.lekh~github-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [username],
        }),
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      console.error('[enrich-github] Apify error:', errText);
      throw new Error(`Apify GitHub scraper failed: ${runResponse.status}`);
    }

    const results = await runResponse.json();
    const profile = results?.[0];

    if (!profile || profile.error) {
      // Username didn't resolve
      const githubData = {
        username,
        found: false,
        searched_at: new Date().toISOString(),
      };

      await supabase
        .from('candidate_profiles')
        .update({
          github_profile_data: githubData,
          github_username: username,
          enrichment_sources: [...(candidate.enrichment_sources || []).filter((s: string) => s !== 'github'), 'github'],
        })
        .eq('id', candidateId);

      return new Response(JSON.stringify({
        success: true,
        found: false,
        username,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Structure the data
    const githubData = {
      username: profile.login || username,
      found: true,
      name: profile.name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      public_repos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      created_at: profile.created_at,
      top_languages: profile.topLanguages || [],
      pinned_repos: (profile.pinnedItems || []).slice(0, 6).map((r: any) => ({
        name: r.name,
        description: r.description,
        stars: r.stargazerCount || r.stars || 0,
        language: r.primaryLanguage?.name || r.language,
        url: r.url,
      })),
      contributions: profile.contributionsCollection || null,
      total_stars: profile.totalStars || 0,
      scraped_at: new Date().toISOString(),
    };

    // Update candidate
    await supabase
      .from('candidate_profiles')
      .update({
        github_profile_data: githubData,
        github_username: profile.login || username,
        enrichment_sources: [...(candidate.enrichment_sources || []).filter((s: string) => s !== 'github'), 'github'],
      })
      .eq('id', candidateId);

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'enrichment.github',
      entity_type: 'candidate_profile',
      entity_id: candidateId,
      details: { username: profile.login || username, repos: profile.public_repos },
    }).catch(() => {});

    console.log(`[enrich-github] Success for ${username}: ${profile.public_repos} repos`);

    return new Response(JSON.stringify({
      success: true,
      found: true,
      data: githubData,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[enrich-github] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
