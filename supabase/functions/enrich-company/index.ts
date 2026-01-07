import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cached } = await supabase
      .from('company_enrichment_cache')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log(`Cache hit for domain: ${domain}`);
      return new Response(
        JSON.stringify({ data: cached, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to enrich company data
    const aiPrompt = `You are a company data enrichment API. Given the domain "${domain}", provide realistic company information in JSON format with these fields:
    - company_name: The company's official name
    - description: A brief 1-2 sentence description
    - industry: Primary industry (e.g., Technology, Finance, Healthcare)
    - employee_count: Employee range (e.g., "50-200", "1000-5000")
    - location: Headquarters location
    - founded_year: Year founded (estimate if unknown)
    - linkedin_url: LinkedIn company page URL
    
    Return ONLY valid JSON, no markdown or explanation.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: aiPrompt }]
      })
    });

    let enrichmentData;
    
    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      const content = aiResult.content?.[0]?.text;
      try {
        enrichmentData = JSON.parse(content);
      } catch {
        // Fallback to domain-based inference
        enrichmentData = inferFromDomain(domain);
      }
    } else {
      enrichmentData = inferFromDomain(domain);
    }

    // Store in cache
    const { data: stored, error: storeError } = await supabase
      .from('company_enrichment_cache')
      .upsert({
        domain: domain.toLowerCase(),
        company_name: enrichmentData.company_name,
        description: enrichmentData.description,
        industry: enrichmentData.industry,
        employee_count: enrichmentData.employee_count,
        location: enrichmentData.location,
        founded_year: enrichmentData.founded_year,
        linkedin_url: enrichmentData.linkedin_url,
        enrichment_source: 'lovable_ai',
        enrichment_data: enrichmentData,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'domain' })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing enrichment:', storeError);
    }

    return new Response(
      JSON.stringify({ data: stored || enrichmentData, source: 'fresh' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enrichment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function inferFromDomain(domain: string) {
  const name = domain.split('.')[0];
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  
  return {
    company_name: capitalizedName,
    description: `${capitalizedName} is a company operating in the technology sector.`,
    industry: 'Technology',
    employee_count: '50-200',
    location: 'Netherlands',
    founded_year: '2018',
    linkedin_url: `https://linkedin.com/company/${name}`
  };
}