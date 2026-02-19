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
  const proxycurlKey = Deno.env.get('PROXYCURL_API_KEY');

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
    if (!proxycurlKey) throw new Error('PROXYCURL_API_KEY not configured');

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
      // Get employee count (1 credit)
      const countRes = await fetch(
        `https://nubela.co/proxycurl/api/linkedin/company/employees/count/?url=${encodeURIComponent(company.linkedin_url)}`,
        { headers: { 'Authorization': `Bearer ${proxycurlKey}` } }
      );

      let headcount = 0;
      if (countRes.ok) {
        const countData = await countRes.json();
        headcount = countData.linkedin_employee_count || countData.total_employee_count || 0;
      }

      // Check monthly credit spend
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: ledgerData } = await supabase
        .from('proxycurl_credit_ledger')
        .select('credits_actual')
        .gte('created_at', monthStart.toISOString());

      const monthlySpend = (ledgerData || []).reduce((sum: number, r: any) => sum + (r.credits_actual || 0), 0);

      // Estimate: 3 credits for listing (URL-only) + 10 per profile enrichment
      const listingCredits = headcount * 3;
      const enrichmentCredits = headcount * 10;
      const totalEstimate = listingCredits + enrichmentCredits + 1; // +1 for count endpoint

      return new Response(JSON.stringify({
        success: true,
        estimate: {
          headcount,
          listingCredits,
          enrichmentCredits,
          totalEstimate,
          monthlySpendSoFar: monthlySpend,
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

      // Log credit estimate
      await supabase.from('proxycurl_credit_ledger').insert({
        scan_job_id: scanJob.id,
        company_id: companyId,
        endpoint_used: 'employee_count',
        credits_estimated: 1,
        credits_actual: 1,
      });

      // Fetch employee listing (URL-only mode for speed)
      let allProfileUrls: string[] = [];
      let nextPage: string | null = `https://nubela.co/proxycurl/api/linkedin/company/employees/?url=${encodeURIComponent(company.linkedin_url)}&enrich_profiles=skip&page_size=100`;

      await supabase.from('company_scan_jobs')
        .update({ status: 'listing' })
        .eq('id', scanJob.id);

      let pageCount = 0;
      while (nextPage && pageCount < 20) { // Safety limit: 20 pages = 2000 people
        const listRes = await fetch(nextPage, {
          headers: { 'Authorization': `Bearer ${proxycurlKey}` },
        });

        if (!listRes.ok) {
          const errText = await listRes.text();
          console.error('Employee listing error:', listRes.status, errText);
          break;
        }

        const listData = await listRes.json();
        const employees = listData.employees || [];
        const profileUrls = employees
          .map((e: any) => e.profile_url)
          .filter((url: string) => url && url.includes('linkedin.com'));

        allProfileUrls.push(...profileUrls);
        nextPage = listData.next_page || null;
        pageCount++;
      }

      // Log listing credits
      await supabase.from('proxycurl_credit_ledger').insert({
        scan_job_id: scanJob.id,
        company_id: companyId,
        endpoint_used: 'employee_listing',
        credits_estimated: allProfileUrls.length * 3,
        credits_actual: allProfileUrls.length * 3,
      });

      // If we got very few results, try employee search endpoint (works globally)
      // This is the fallback for non-US/UK companies
      if (allProfileUrls.length < 10 && company.linkedin_url) {
        console.log('Few results from listing, trying search endpoint...');
        const searchRes = await fetch(
          `https://nubela.co/proxycurl/api/linkedin/company/employee/search/?linkedin_company_url=${encodeURIComponent(company.linkedin_url)}&page_size=100`,
          { headers: { 'Authorization': `Bearer ${proxycurlKey}` } }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const searchUrls = (searchData.employees || [])
            .map((e: any) => e.profile_url)
            .filter((url: string) => url && url.includes('linkedin.com') && !allProfileUrls.includes(url));

          allProfileUrls.push(...searchUrls);

          await supabase.from('proxycurl_credit_ledger').insert({
            scan_job_id: scanJob.id,
            company_id: companyId,
            endpoint_used: 'employee_search',
            credits_estimated: searchUrls.length * 10,
            credits_actual: searchUrls.length * 10,
          });
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
          credits_estimated: allProfileUrls.length * 13, // 3 listing + 10 enrichment
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
