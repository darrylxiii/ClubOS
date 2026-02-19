import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const apifyKey = Deno.env.get('APIFY_API_KEY');

  // Auth check
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

  // Service role client for writes
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { companyId, action } = await req.json();

    if (!companyId) throw new Error('companyId is required');
    if (!apifyKey) throw new Error('APIFY_API_KEY not configured');

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, linkedin_url, company_size')
      .eq('id', companyId)
      .single();

    if (companyError || !company) throw new Error('Company not found');
    if (!company.linkedin_url) throw new Error('Company has no LinkedIn URL configured');

    // Validate LinkedIn URL format
    const linkedinUrlPattern = /^https?:\/\/(www\.)?linkedin\.com\/company\/.+/i;
    if (!linkedinUrlPattern.test(company.linkedin_url)) {
      throw new Error('Invalid LinkedIn company URL format. Expected: https://linkedin.com/company/...');
    }

    // ========== ACTION: estimate ==========
    if (action === 'estimate') {
      // Use Apify to get a quick employee listing estimate
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let headcount = 0;
      try {
        const response = await fetch(
          `https://api.apify.com/v2/acts/apimaestro~linkedin-company-employees-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              companyUrl: company.linkedin_url,
              maxItems: 1, // Just get count estimate, not full listing
            }),
          }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const results = await response.json();
          // Apify returns items; the total count may be in the response metadata
          // For a quick estimate, use company_size from DB or the result length
          headcount = results?.length || 0;
        } else {
          await response.text(); // consume body
        }
      } catch (e) {
        clearTimeout(timeoutId);
        console.warn('Estimate fetch failed, using company_size fallback:', e);
      }

      // Fall back to stored company size if Apify didn't return a count
      if (headcount === 0 && company.company_size) {
        headcount = company.company_size;
      }

      return new Response(JSON.stringify({
        success: true,
        estimate: {
          headcount,
          totalEstimate: headcount, // Apify billing is per-actor-run, not per-profile
          warning: headcount > 1000 ? 'Company has over 1000 employees. Consider scanning specific departments.' : null,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== ACTION: start (begin full scan) ==========
    if (action === 'start') {
      // Create scan job
      const { data: scanJob, error: jobError } = await supabase
        .from('company_scan_jobs')
        .insert({
          company_id: companyId,
          status: 'discovering',
          triggered_by: user.id,
          scan_type: 'full',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) throw new Error(`Failed to create scan job: ${jobError.message}`);

      // Fetch employee listing via Apify
      let allProfileUrls: string[] = [];

      await supabase.from('company_scan_jobs')
        .update({ status: 'listing' })
        .eq('id', scanJob.id);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      try {
        const response = await fetch(
          `https://api.apify.com/v2/acts/apimaestro~linkedin-company-employees-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              companyUrl: company.linkedin_url,
              maxItems: 2000, // Safety cap
            }),
          }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          console.error('Apify employee listing error:', response.status, errText);
          throw new Error(`Apify employee listing failed: ${response.status}`);
        }

        const results = await response.json();
        const employees = Array.isArray(results) ? results : [];

        // Extract LinkedIn profile URLs from results
        for (const emp of employees) {
          const url = emp.profileUrl || emp.linkedin_url || emp.url || emp.linkedinUrl || emp.profile_url;
          if (url && typeof url === 'string' && url.includes('linkedin.com/in/')) {
            allProfileUrls.push(url);
          }
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          console.error('Apify employee listing timed out');
        } else {
          throw e;
        }
      }

      // Deduplicate URLs
      allProfileUrls = [...new Set(allProfileUrls)];

      // Create queue items
      if (allProfileUrls.length > 0) {
        const queueItems = allProfileUrls.map(url => ({
          scan_job_id: scanJob.id,
          linkedin_url: url,
          status: 'pending',
        }));

        // Insert in batches of 100
        for (let i = 0; i < queueItems.length; i += 100) {
          const batch = queueItems.slice(i, i + 100);
          await supabase.from('company_scan_queue').insert(batch);
        }
      }

      // Update scan job with totals
      await supabase.from('company_scan_jobs')
        .update({
          status: allProfileUrls.length > 0 ? 'enriching' : 'completed',
          total_employees_found: allProfileUrls.length,
          completed_at: allProfileUrls.length === 0 ? new Date().toISOString() : null,
        })
        .eq('id', scanJob.id);

      return new Response(JSON.stringify({
        success: true,
        scanJobId: scanJob.id,
        employeesFound: allProfileUrls.length,
        message: allProfileUrls.length > 0
          ? `Found ${allProfileUrls.length} employees. Enrichment will process in batches.`
          : 'No employees found. Check the company LinkedIn URL.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== ACTION: pause / resume ==========
    if (action === 'pause' || action === 'resume') {
      const { scanJobId } = await req.json();
      const newStatus = action === 'pause' ? 'paused' : 'enriching';
      await supabase.from('company_scan_jobs')
        .update({ status: newStatus })
        .eq('id', scanJobId);

      return new Response(JSON.stringify({ success: true, status: newStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}. Use 'estimate', 'start', 'pause', or 'resume'.`);

  } catch (error) {
    console.error('scan-partner-organization error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
