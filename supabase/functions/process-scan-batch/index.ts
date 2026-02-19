import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BATCH_SIZE = 10;

function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^\/\?#]+)/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const apifyKey = Deno.env.get('APIFY_API_KEY');

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
    if (!apifyKey) throw new Error('APIFY_API_KEY not configured');

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

    for (const item of queueItems) {
      // Mark as processing
      await supabase.from('company_scan_queue')
        .update({ status: 'processing', attempts: item.attempts + 1 })
        .eq('id', item.id);

      try {
        const username = extractUsernameFromUrl(item.linkedin_url);
        if (!username) throw new Error('Could not extract username from URL');

        // Fetch profile from Apify
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const profileRes = await fetch(
          `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ username }),
          }
        );
        clearTimeout(timeoutId);

        if (!profileRes.ok) {
          const errText = await profileRes.text();
          throw new Error(`Apify ${profileRes.status}: ${errText}`);
        }

        const results = await profileRes.json();
        const rawData = Array.isArray(results) ? (results[0] || {}) : (results || {});
        const basicInfo = rawData.basic_info || {};
        const profile = { ...basicInfo, ...rawData };

        // Extract experience data
        const rawExp = profile.experience || profile.experiences || profile.positions || [];

        // Calculate tenure at this company
        const currentExperience = rawExp.find((exp: any) => {
          const endDate = exp.endDate || exp.end_date || exp.ends_at;
          return !endDate || endDate === 'Present';
        });

        let yearsAtCompany: number | null = null;
        if (currentExperience) {
          const startDate = currentExperience.startDate || currentExperience.start_date || currentExperience.starts_at;
          if (startDate) {
            const parsed = new Date(typeof startDate === 'object' ? `${startDate.year}-${startDate.month || 1}` : startDate);
            if (!isNaN(parsed.getTime())) {
              const months = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
              yearsAtCompany = Math.round(months / 12 * 10) / 10;
            }
          }
        }

        // Calculate total experience
        let totalExperience = 0;
        for (const exp of rawExp) {
          const startVal = exp.startDate || exp.start_date || exp.starts_at;
          const endVal = exp.endDate || exp.end_date || exp.ends_at;
          if (startVal) {
            const start = new Date(typeof startVal === 'object' ? `${startVal.year}-${startVal.month || 1}` : startVal);
            const end = endVal && endVal !== 'Present'
              ? new Date(typeof endVal === 'object' ? `${endVal.year}-${endVal.month || 12}` : endVal)
              : new Date();
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              totalExperience += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
            }
          }
        }

        const fullName = profile.fullname || profile.fullName || profile.full_name || profile.name ||
          (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : null);
        const currentTitle = profile.headline || profile.title || profile.occupation || currentExperience?.title;
        const linkedinPublicId = username;

        // Upsert into company_people
        const personData = {
          company_id: scanJob.company_id,
          linkedin_url: item.linkedin_url,
          linkedin_public_id: linkedinPublicId,
          full_name: fullName || null,
          first_name: profile.firstName || profile.first_name || null,
          last_name: profile.lastName || profile.last_name || null,
          avatar_url: profile.profile_picture_url || profile.profilePicture || profile.profilePictureUrl || profile.profile_pic_url || null,
          current_title: currentTitle,
          location: profile.location || profile.addressLocality || profile.city || null,
          headline: profile.headline || null,
          skills: ((profile.skills || []).map((s: any) => typeof s === 'string' ? s : (s.name || s.skill || '')).filter(Boolean)).slice(0, 50),
          years_at_company: yearsAtCompany,
          total_experience_years: Math.round(totalExperience * 10) / 10,
          work_history: rawExp.map((exp: any) => ({
            title: exp.title || exp.role || exp.position || '',
            company: exp.company || exp.companyName || exp.organization || '',
            location: exp.location || exp.locationName || '',
            start_date: exp.startDate || exp.start_date || null,
            end_date: exp.endDate || exp.end_date || null,
            description: exp.description || exp.summary || '',
          })),
          education: (profile.education || profile.educations || []).map((edu: any) => ({
            institution: edu.school || edu.schoolName || edu.institution || '',
            degree: edu.degree || edu.degreeName || edu.degree_name || '',
            field: edu.field || edu.fieldOfStudy || edu.field_of_study || '',
            start_year: edu.startYear || edu.start_year || (edu.starts_at?.year) || null,
            end_year: edu.endYear || edu.end_year || (edu.ends_at?.year) || null,
          })),
          is_still_active: true,
          employment_status: 'current',
          last_seen_at: new Date().toISOString(),
          last_refreshed_at: new Date().toISOString(),
          auto_purge_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 12 months
          enrichment_status: 'enriched',
          profile_data_raw: rawData,
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

    // Update scan job progress
    await supabase.from('company_scan_jobs')
      .update({
        profiles_enriched: (scanJob.profiles_enriched || 0) + enriched,
        profiles_failed: (scanJob.profiles_failed || 0) + failed,
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
