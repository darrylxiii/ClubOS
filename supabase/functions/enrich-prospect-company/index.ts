import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentData {
  name?: string;
  domain?: string;
  description?: string;
  industry?: string;
  employeeCount?: string;
  founded?: string;
  location?: string;
  linkedin?: string;
  twitter?: string;
  logo?: string;
  revenue?: string;
  technologies?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prospect_id, company_domain, company_name } = await req.json();

    if (!prospect_id) {
      return new Response(
        JSON.stringify({ error: 'prospect_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[enrich-prospect-company] Starting enrichment', { prospect_id, company_domain, company_name });

    // Fetch the prospect
    const { data: prospect, error: prospectError } = await supabase
      .from('crm_prospects')
      .select('*')
      .eq('id', prospect_id)
      .single();

    if (prospectError || !prospect) {
      return new Response(
        JSON.stringify({ error: 'Prospect not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = company_domain || prospect.company_domain;
    const name = company_name || prospect.company_name;

    if (!domain && !name) {
      return new Response(
        JSON.stringify({ error: 'Company domain or name is required for enrichment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we have cached enrichment data
    const { data: cachedData } = await supabase
      .from('company_enrichment_cache')
      .select('*')
      .eq('domain', domain)
      .single();

    let enrichmentData: EnrichmentData | null = null;

    if (cachedData && cachedData.enriched_at) {
      // Check if cache is less than 30 days old
      const cacheAge = Date.now() - new Date(cachedData.enriched_at).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (cacheAge < thirtyDays) {
        console.log('[enrich-prospect-company] Using cached enrichment data');
        enrichmentData = cachedData.data as EnrichmentData;
      }
    }

    if (!enrichmentData) {
      // Try to enrich using available APIs
      // Note: In production, you would integrate with Clearbit, Apollo, or similar
      // For now, we'll use a simulated enrichment based on domain analysis
      
      enrichmentData = await simulateEnrichment(domain, name);

      // Cache the enrichment data
      if (enrichmentData && domain) {
        await supabase
          .from('company_enrichment_cache')
          .upsert({
            domain,
            data: enrichmentData,
            enriched_at: new Date().toISOString(),
            source: 'simulated', // Would be 'clearbit', 'apollo', etc.
          });
      }
    }

    // Update prospect with enriched data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      enrichment_status: 'enriched',
      enriched_at: new Date().toISOString(),
    };

    if (enrichmentData) {
      if (enrichmentData.industry && !prospect.industry) {
        updateData.industry = enrichmentData.industry;
      }
      if (enrichmentData.employeeCount && !prospect.company_size) {
        updateData.company_size = enrichmentData.employeeCount;
      }
      if (enrichmentData.linkedin && !prospect.linkedin_url) {
        updateData.linkedin_url = enrichmentData.linkedin;
      }
      if (enrichmentData.description) {
        updateData.company_description = enrichmentData.description;
      }
      if (enrichmentData.logo) {
        updateData.company_logo_url = enrichmentData.logo;
      }
      if (enrichmentData.location) {
        updateData.company_location = enrichmentData.location;
      }
      if (enrichmentData.technologies) {
        updateData.company_technologies = enrichmentData.technologies;
      }
      if (enrichmentData.revenue) {
        updateData.company_revenue = enrichmentData.revenue;
      }

      // Store full enrichment data in metadata
      updateData.enrichment_data = enrichmentData;
    }

    const { error: updateError } = await supabase
      .from('crm_prospects')
      .update(updateData)
      .eq('id', prospect_id);

    if (updateError) {
      console.error('[enrich-prospect-company] Error updating prospect:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update prospect', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create activity log
    await supabase
      .from('crm_touchpoints')
      .insert({
        prospect_id,
        type: 'other',
        direction: 'outbound',
        subject: 'Company Data Enriched',
        body_preview: `Enriched company data for ${name || domain}`,
        occurred_at: new Date().toISOString(),
      });

    console.log('[enrich-prospect-company] Enrichment complete', { 
      prospect_id, 
      fields_updated: Object.keys(updateData).length 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        enrichment_data: enrichmentData,
        fields_updated: Object.keys(updateData),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[enrich-prospect-company] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simulated enrichment function - replace with real API calls in production
async function simulateEnrichment(domain?: string, name?: string): Promise<EnrichmentData | null> {
  if (!domain && !name) return null;

  // Simulate some delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Generate plausible data based on domain
  const cleanDomain = domain?.replace(/^www\./, '') || '';
  
  // Industry detection based on common domain patterns
  let industry = 'Technology';
  if (cleanDomain.includes('bank') || cleanDomain.includes('finance')) {
    industry = 'Financial Services';
  } else if (cleanDomain.includes('health') || cleanDomain.includes('med')) {
    industry = 'Healthcare';
  } else if (cleanDomain.includes('edu') || cleanDomain.includes('university')) {
    industry = 'Education';
  } else if (cleanDomain.includes('retail') || cleanDomain.includes('shop')) {
    industry = 'Retail';
  }

  // Size estimation (would be from real data)
  const sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'];
  const randomSize = sizes[Math.floor(Math.random() * sizes.length)];

  return {
    name: name || cleanDomain.split('.')[0].charAt(0).toUpperCase() + cleanDomain.split('.')[0].slice(1),
    domain: cleanDomain,
    description: `A leading company in the ${industry} sector.`,
    industry,
    employeeCount: randomSize,
    location: 'Netherlands',
    linkedin: domain ? `https://linkedin.com/company/${cleanDomain.split('.')[0]}` : undefined,
    technologies: ['React', 'Node.js', 'AWS'].slice(0, Math.floor(Math.random() * 3) + 1),
  };
}
