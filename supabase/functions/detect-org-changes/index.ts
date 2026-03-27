import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const apifyKey = Deno.env.get('APIFY_API_KEY');

  const body = await req.json().catch(() => ({}));
  const targetCompanyId = body.companyId; // Optional: scan specific company

  if (!apifyKey) throw new Error('APIFY_API_KEY not configured');

  // Find companies due for re-scan
  let companiesQuery = ctx.supabase
    .from('companies')
    .select('id, name, linkedin_url')
    .not('linkedin_url', 'is', null);

  if (targetCompanyId) {
    companiesQuery = companiesQuery.eq('id', targetCompanyId);
  }

  const { data: companies, error: companiesError } = await companiesQuery.limit(10);
  if (companiesError) throw new Error(`Failed to fetch companies: ${companiesError.message}`);
  if (!companies || companies.length === 0) {
    return new Response(JSON.stringify({ success: true, message: 'No companies to scan', processed: 0 }), {
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ companyId: string; name: string; newHires: number; departures: number; titleChanges: number; skipped: boolean; reason?: string }> = [];

  for (const company of companies) {
    // Validate LinkedIn URL
    if (!company.linkedin_url || !company.linkedin_url.includes('linkedin.com/company/')) {
      results.push({ companyId: company.id, name: company.name, newHires: 0, departures: 0, titleChanges: 0, skipped: true, reason: 'Invalid LinkedIn URL' });
      continue;
    }

    // Check if we have existing people for this company
    const { count: existingCount } = await ctx.supabase
      .from('company_people')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('is_still_active', true);

    if (!existingCount || existingCount === 0) {
      results.push({ companyId: company.id, name: company.name, newHires: 0, departures: 0, titleChanges: 0, skipped: true, reason: 'No existing people data' });
      continue;
    }

    // Fetch current employee URLs via Apify
    let currentUrls: string[] = [];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(
        `https://api.apify.com/v2/acts/apimaestro~linkedin-company-employees-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            companyUrl: company.linkedin_url,
            maxItems: 2000,
          }),
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        results.push({ companyId: company.id, name: company.name, newHires: 0, departures: 0, titleChanges: 0, skipped: true, reason: `Apify error: ${response.status}` });
        continue;
      }

      const employees = await response.json();
      for (const emp of (Array.isArray(employees) ? employees : [])) {
        const url = emp.profileUrl || emp.linkedin_url || emp.url || emp.linkedinUrl || emp.profile_url;
        if (url && typeof url === 'string' && url.includes('linkedin.com/in/')) {
          currentUrls.push(url);
        }
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      results.push({ companyId: company.id, name: company.name, newHires: 0, departures: 0, titleChanges: 0, skipped: true, reason: e.name === 'AbortError' ? 'Apify timeout' : e.message });
      continue;
    }

    // Deduplicate
    currentUrls = [...new Set(currentUrls)];

    // Get stored active people
    const { data: storedPeople } = await ctx.supabase
      .from('company_people')
      .select('id, linkedin_url, current_title, full_name')
      .eq('company_id', company.id)
      .eq('is_still_active', true);

    const storedUrlMap = new Map<string, { id: string; title: string | null; name: string | null }>();
    (storedPeople || []).forEach(p => {
      if (p.linkedin_url) {
        storedUrlMap.set(p.linkedin_url, { id: p.id, title: p.current_title, name: p.full_name });
      }
    });

    const storedUrls = new Set(storedUrlMap.keys());
    const currentUrlSet = new Set(currentUrls);

    // Detect NEW hires (in current but not in stored)
    const newHireUrls = currentUrls.filter(url => !storedUrls.has(url));
    let newHireCount = 0;

    for (const url of newHireUrls.slice(0, 20)) { // Cap at 20 per delta scan
      const { data: newPerson } = await ctx.supabase
        .from('company_people')
        .upsert({
          company_id: company.id,
          linkedin_url: url,
          is_still_active: true,
          employment_status: 'new_hire',
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          enrichment_status: 'pending',
          data_legal_basis: 'legitimate_interest',
          auto_purge_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'company_id,linkedin_url' })
        .select('id')
        .single();

      if (newPerson) {
        await ctx.supabase.from('company_people_changes').insert({
          company_id: company.id,
          person_id: newPerson.id,
          change_type: 'new_hire',
          new_value: url,
          detected_at: new Date().toISOString(),
        });
        newHireCount++;
      }
    }

    // Detect DEPARTURES (in stored but not in current)
    const departedUrls = Array.from(storedUrls).filter(url => !currentUrlSet.has(url));
    let departureCount = 0;

    for (const url of departedUrls) {
      const person = storedUrlMap.get(url);
      if (!person) continue;

      await ctx.supabase.from('company_people')
        .update({
          is_still_active: false,
          employment_status: 'departed',
          departed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', person.id);

      await ctx.supabase.from('company_people_changes').insert({
        company_id: company.id,
        person_id: person.id,
        change_type: 'departure',
        old_value: person.title || person.name || url,
        detected_at: new Date().toISOString(),
      });

      departureCount++;
    }

    // Update last_seen_at for still-active people
    const stillActiveUrls = currentUrls.filter(url => storedUrls.has(url));
    if (stillActiveUrls.length > 0) {
      for (let i = 0; i < stillActiveUrls.length; i += 50) {
        const chunk = stillActiveUrls.slice(i, i + 50);
        await ctx.supabase.from('company_people')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('company_id', company.id)
          .in('linkedin_url', chunk);
      }
    }

    results.push({
      companyId: company.id,
      name: company.name,
      newHires: newHireCount,
      departures: departureCount,
      titleChanges: 0,
      skipped: false,
    });

    // Delay between companies
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const totalChanges = results.reduce((sum, r) => sum + r.newHires + r.departures, 0);

  return new Response(JSON.stringify({
    success: true,
    processed: results.length,
    totalChanges,
    results,
  }), { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } });
}));
