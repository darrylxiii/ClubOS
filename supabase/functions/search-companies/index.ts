import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ companies: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching companies for query:', query);

    // Use Clearbit Autocomplete API (free, no auth required)
    const response = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`
    );

    console.log('Clearbit response status:', response.status);

    if (!response.ok) {
      console.error('Clearbit API error:', response.status, await response.text());
      // Return empty array instead of erroring out
      return new Response(
        JSON.stringify({ companies: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companies = await response.json();
    console.log('Raw companies from Clearbit:', companies);
    
    // Transform to our format
    const formattedCompanies = companies.map((company: any) => ({
      name: company.name,
      domain: company.domain,
      logo: company.logo
    }));

    console.log('Found companies:', formattedCompanies.length);

    return new Response(
      JSON.stringify({ companies: formattedCompanies }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-companies:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, companies: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
