import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { domain } = await req.json();

  if (!domain) {
    return new Response(
      JSON.stringify({ error: 'Domain is required' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = ctx.supabase;

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
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Google Gemini API for company enrichment (no external API key required)
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    
    const aiPrompt = `You are a company data enrichment API. Given the domain "${domain}", provide realistic company information in JSON format with these fields:
    - company_name: The company's official name
    - description: A brief 1-2 sentence description
    - industry: Primary industry (e.g., Technology, Finance, Healthcare)
    - employee_count: Employee range (e.g., "50-200", "1000-5000")
    - location: Headquarters location
    - founded_year: Year founded (estimate if unknown)
    - linkedin_url: LinkedIn company page URL
    
    Return ONLY valid JSON, no markdown or explanation.`;

    let enrichmentData;

    if (GOOGLE_API_KEY) {
      try {
        const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GOOGLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: aiPrompt }],
            max_tokens: 500,
          })
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const content = aiResult.choices?.[0]?.message?.content;
          try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              enrichmentData = JSON.parse(jsonMatch[0]);
            } else {
              enrichmentData = JSON.parse(content);
            }
          } catch {
            console.log('Failed to parse AI response, using fallback');
            enrichmentData = inferFromDomain(domain);
          }
        } else {
          const errorText = await aiResponse.text();
          console.error('Google Gemini error:', aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (aiResponse.status === 402) {
            return new Response(
              JSON.stringify({ error: 'AI quota exceeded. Please check your Google API billing.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          enrichmentData = inferFromDomain(domain);
        }
      } catch (aiError) {
        console.error('AI enrichment error:', aiError);
        enrichmentData = inferFromDomain(domain);
      }
    } else {
      console.log('GOOGLE_API_KEY not configured, using fallback');
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
        enrichment_source: GOOGLE_API_KEY ? 'google_gemini' : 'inference',
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
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );

}));

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
