import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const supabase = ctx.supabase;
  const user = ctx.user;
  const apifyKey = Deno.env.get('APIFY_API_KEY');

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
      let headcount = 0;

      // Try Apify employee scraper with a larger sample to get real count
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      try {
        const response = await fetch(
          `https://api.apify.com/v2/acts/apimaestro~linkedin-company-employees-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              companyUrl: company.linkedin_url,
              maxItems: 500, // Fetch enough to get a real count
            }),
          }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const results = await response.json();
          headcount = Array.isArray(results) ? results.length : 0;
        } else {
          const errText = await response.text();
          console.warn('Apify estimate response error:', response.status, errText);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        console.warn('Estimate fetch failed, using company_size fallback:', e);
      }

      // Fall back to stored company size
      if (headcount === 0 && company.company_size) {
        headcount = company.company_size;
      }

      // Backfill company_size for future fast lookups
      if (headcount > 0 && headcount !== company.company_size) {
        await supabase.from('companies')
          .update({ company_size: headcount })
          .eq('id', companyId);
      }

      // Calculate monthly spend so far from scan jobs this month
      let monthlySpendSoFar = 0;
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthJobs } = await supabase
          .from('company_scan_jobs')
          .select('credits_used')
          .gte('started_at', startOfMonth.toISOString());

        if (monthJobs) {
          monthlySpendSoFar = monthJobs.reduce((sum: number, j: any) => sum + (j.credits_used || 0), 0);
        }
      } catch (e) {
        console.warn('Failed to get monthly spend:', e);
      }

      const listingCredits = 1; // 1 actor run for employee listing
      const enrichmentCredits = headcount; // ~1 per profile enrichment
      const totalEstimate = listingCredits + enrichmentCredits;

      return new Response(JSON.stringify({
        success: true,
        estimate: {
          headcount,
          listingCredits,
          enrichmentCredits,
          totalEstimate,
          monthlySpendSoFar,
          warning: headcount > 1000
            ? 'Company has over 1000 employees. Consider scanning specific departments.'
            : headcount === 0
              ? 'Could not determine employee count. The company LinkedIn URL may be incorrect.'
              : null,
        },
      }), { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } });
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
      }), { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== ACTION: pause / resume ==========
    if (action === 'pause' || action === 'resume') {
      const { scanJobId } = await req.json();
      const newStatus = action === 'pause' ? 'paused' : 'enriching';
      await supabase.from('company_scan_jobs')
        .update({ status: newStatus })
        .eq('id', scanJobId);

      return new Response(JSON.stringify({ success: true, status: newStatus }), {
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}. Use 'estimate', 'start', 'pause', or 'resume'.`);
}));
