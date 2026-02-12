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

    const { data: candidate, error: fetchErr } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, current_company, email, enrichment_sources')
      .eq('id', candidateId)
      .single();

    if (fetchErr || !candidate) throw new Error('Candidate not found');

    const name = candidate.full_name;
    if (!name) {
      return new Response(JSON.stringify({
        success: true, skipped: true, reason: 'No full name available',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build search queries
    const queries = [
      `"${name}" ${candidate.current_company || ''}`.trim(),
      `"${name}" conference OR speaker OR talk OR podcast`,
      `"${name}" published OR article OR blog OR medium`,
    ];

    console.log(`[enrich-public] Searching for: ${name}`);

    const allResults: any[] = [];

    for (const query of queries) {
      try {
        const runResponse = await fetch(
          `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queries: query,
              maxPagesPerQuery: 1,
              resultsPerPage: 10,
              languageCode: 'en',
            }),
          }
        );

        if (runResponse.ok) {
          const results = await runResponse.json();
          if (Array.isArray(results)) {
            for (const result of results) {
              if (result.organicResults) {
                allResults.push(...result.organicResults);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[enrich-public] Query failed: ${query}`, err);
      }
    }

    // Deduplicate by URL and categorize
    const seen = new Set<string>();
    const articles: any[] = [];
    const talks: any[] = [];
    const mentions: any[] = [];
    const portfolioUrls: string[] = [];

    for (const r of allResults) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);

      const url = r.url.toLowerCase();
      const title = (r.title || '').toLowerCase();
      const entry = {
        title: r.title,
        url: r.url,
        description: r.description,
        source: new URL(r.url).hostname.replace('www.', ''),
      };

      // Categorize
      if (url.includes('medium.com') || url.includes('substack.com') || url.includes('dev.to') ||
          url.includes('hashnode') || title.includes('article') || title.includes('blog')) {
        articles.push(entry);
      } else if (title.includes('talk') || title.includes('speaker') || title.includes('conference') ||
                 title.includes('podcast') || url.includes('youtube.com') || url.includes('slideshare')) {
        talks.push(entry);
      } else if (url.includes('behance.net') || url.includes('dribbble.com') ||
                 url.includes('portfolio') || title.includes('portfolio')) {
        portfolioUrls.push(r.url);
        mentions.push(entry);
      } else {
        mentions.push(entry);
      }
    }

    const publicMentions = {
      articles: articles.slice(0, 20),
      talks: talks.slice(0, 10),
      mentions: mentions.slice(0, 20),
      discovered_portfolio_urls: portfolioUrls.slice(0, 5),
      total_results: allResults.length,
      searched_at: new Date().toISOString(),
      queries_used: queries,
    };

    await supabase
      .from('candidate_profiles')
      .update({
        public_mentions: publicMentions,
        enrichment_sources: [...(candidate.enrichment_sources || []).filter((s: string) => s !== 'google'), 'google'],
      })
      .eq('id', candidateId);

    // Audit log
    await supabase.from('audit_logs').insert({
      action: 'enrichment.public_presence',
      entity_type: 'candidate_profile',
      entity_id: candidateId,
      details: { articles: articles.length, talks: talks.length, mentions: mentions.length },
    }).catch(() => {});

    console.log(`[enrich-public] Found ${articles.length} articles, ${talks.length} talks, ${mentions.length} mentions`);

    return new Response(JSON.stringify({
      success: true,
      data: publicMentions,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[enrich-public] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
