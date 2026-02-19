import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BATCH_SIZE = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const proxycurlKey = Deno.env.get('PROXYCURL_API_KEY');

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { scanJobId } = await req.json();
    if (!scanJobId) throw new Error('scanJobId is required');
    if (!proxycurlKey) throw new Error('PROXYCURL_API_KEY not configured');

    // Check scan job status
    const { data: scanJob, error: jobError } = await supabase
      .from('company_scan_jobs')
      .select('*')
      .eq('id', scanJobId)
      .single();

    if (jobError || !scanJob) throw new Error('Scan job not found');
    if (scanJob.status === 'paused') {
      return new Response(JSON.stringify({ success: true, paused: true, hasMore: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (scanJob.status !== 'enriching') {
      return new Response(JSON.stringify({ success: true, hasMore: false, status: scanJob.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get next batch of pending items
    const { data: queueItems, error: queueError } = await supabase
      .from('company_scan_queue')
      .select('*')
      .eq('scan_job_id', scanJobId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queueError) throw new Error(`Queue fetch error: ${queueError.message}`);

    if (!queueItems || queueItems.length === 0) {
      // No more items — mark scan as analyzing (for title classification)
      await supabase.from('company_scan_jobs')
        .update({ status: 'analyzing' })
        .eq('id', scanJobId);

      return new Response(JSON.stringify({
        success: true,
        hasMore: false,
        message: 'All profiles enriched. Ready for classification.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process each profile
    let enriched = 0;
    let failed = 0;
    let creditsUsed = 0;

    for (const item of queueItems) {
      // Mark as processing
      await supabase.from('company_scan_queue')
        .update({ status: 'processing', attempts: item.attempts + 1 })
        .eq('id', item.id);

      try {
        // Fetch profile from Proxycurl
        const profileRes = await fetch(
          `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(item.linkedin_url)}`,
          { headers: { 'Authorization': `Bearer ${proxycurlKey}` } }
        );

        if (!profileRes.ok) {
          const errText = await profileRes.text();
          throw new Error(`Proxycurl ${profileRes.status}: ${errText}`);
        }

        const profile = await profileRes.json();
        creditsUsed += 10;

        // Calculate tenure at this company
        const currentExperience = profile.experiences?.find((exp: any) =>
          !exp.ends_at && exp.company_linkedin_profile_url
        );

        let yearsAtCompany: number | null = null;
        if (currentExperience?.starts_at?.year) {
          const startDate = new Date(currentExperience.starts_at.year, (currentExperience.starts_at.month || 1) - 1);
          const months = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          yearsAtCompany = Math.round(months / 12 * 10) / 10;
        }

        // Calculate total experience
        let totalExperience = 0;
        if (profile.experiences) {
          for (const exp of profile.experiences) {
            if (exp.starts_at?.year) {
              const start = new Date(exp.starts_at.year, (exp.starts_at.month || 1) - 1);
              const end = exp.ends_at
                ? new Date(exp.ends_at.year, (exp.ends_at.month || 12) - 1)
                : new Date();
              totalExperience += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
            }
          }
        }

        const currentTitle = profile.occupation || currentExperience?.title || profile.headline;
        const linkedinPublicId = item.linkedin_url.split('/in/')[1]?.replace(/\/$/, '') || null;

        // Upsert into company_people
        const personData = {
          company_id: scanJob.company_id,
          linkedin_url: item.linkedin_url,
          linkedin_public_id: linkedinPublicId,
          full_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          avatar_url: profile.profile_pic_url || null,
          current_title: currentTitle,
          location: profile.city ? `${profile.city}${profile.state ? ', ' + profile.state : ''}${profile.country_full_name ? ', ' + profile.country_full_name : ''}` : null,
          headline: profile.headline || null,
          skills: (profile.skills || []).slice(0, 50),
          years_at_company: yearsAtCompany,
          total_experience_years: Math.round(totalExperience * 10) / 10,
          work_history: (profile.experiences || []).map((exp: any) => ({
            title: exp.title,
            company: exp.company,
            company_linkedin_url: exp.company_linkedin_profile_url,
            location: exp.location,
            start_date: exp.starts_at ? `${exp.starts_at.year}-${String(exp.starts_at.month || 1).padStart(2, '0')}-01` : null,
            end_date: exp.ends_at ? `${exp.ends_at.year}-${String(exp.ends_at.month || 12).padStart(2, '0')}-01` : null,
            description: exp.description,
          })),
          education: (profile.education || []).map((edu: any) => ({
            institution: edu.school,
            degree: edu.degree_name,
            field: edu.field_of_study,
            start_year: edu.starts_at?.year,
            end_year: edu.ends_at?.year,
          })),
          is_still_active: true,
          employment_status: 'current',
          last_seen_at: new Date().toISOString(),
          last_refreshed_at: new Date().toISOString(),
          auto_purge_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 12 months
          enrichment_status: 'enriched',
          profile_data_raw: profile,
          data_legal_basis: 'legitimate_interest',
          updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from('company_people')
          .upsert(personData, {
            onConflict: 'company_id,linkedin_url',
          });

        if (upsertError) {
          throw new Error(`Upsert error: ${upsertError.message}`);
        }

        // Cross-reference against candidate_profiles
        const { data: matchedCandidate } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('linkedin_url', item.linkedin_url)
          .maybeSingle();

        if (matchedCandidate) {
          await supabase
            .from('company_people')
            .update({ matched_candidate_id: matchedCandidate.id })
            .eq('company_id', scanJob.company_id)
            .eq('linkedin_url', item.linkedin_url);
        }

        // Mark queue item as completed
        await supabase.from('company_scan_queue')
          .update({ status: 'completed', processed_at: new Date().toISOString() })
          .eq('id', item.id);

        enriched++;
      } catch (profileError) {
        console.error(`Failed to enrich ${item.linkedin_url}:`, profileError);

        const shouldRetry = item.attempts < 3;
        await supabase.from('company_scan_queue')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            error_message: profileError instanceof Error ? profileError.message : 'Unknown error',
          })
          .eq('id', item.id);

        failed++;
      }

      // Small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Log credits
    if (creditsUsed > 0) {
      await supabase.from('proxycurl_credit_ledger').insert({
        scan_job_id: scanJobId,
        company_id: scanJob.company_id,
        endpoint_used: 'profile_lookup',
        credits_estimated: queueItems.length * 10,
        credits_actual: creditsUsed,
      });
    }

    // Update scan job progress
    await supabase.from('company_scan_jobs')
      .update({
        profiles_enriched: (scanJob.profiles_enriched || 0) + enriched,
        profiles_failed: (scanJob.profiles_failed || 0) + failed,
        credits_used: (scanJob.credits_used || 0) + creditsUsed,
      })
      .eq('id', scanJobId);

    // Check if more items remain
    const { count: remainingCount } = await supabase
      .from('company_scan_queue')
      .select('id', { count: 'exact', head: true })
      .eq('scan_job_id', scanJobId)
      .eq('status', 'pending');

    const hasMore = (remainingCount || 0) > 0;

    return new Response(JSON.stringify({
      success: true,
      enriched,
      failed,
      creditsUsed,
      hasMore,
      remaining: remainingCount || 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('process-scan-batch error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
