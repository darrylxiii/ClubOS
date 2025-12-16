import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchResult {
  company_id: string;
  company_name: string;
  contact_id?: string;
  contact_name?: string;
  match_type: 'exact_email' | 'profile' | 'domain';
  match_confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_address } = await req.json();
    
    if (!email_address) {
      throw new Error('email_address is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedEmail = email_address.toLowerCase().trim();
    const domain = normalizedEmail.split('@')[1];
    
    console.log('Matching email:', normalizedEmail, 'domain:', domain);

    let match: MatchResult | null = null;

    // Priority 1: Exact email match in company_contacts
    const { data: contactMatch } = await supabase
      .from('company_contacts')
      .select(`
        id,
        company_id,
        full_name,
        companies!inner(id, name)
      `)
      .eq('email', normalizedEmail)
      .single();

    if (contactMatch) {
      match = {
        company_id: contactMatch.company_id,
        company_name: (contactMatch.companies as any)?.name || 'Unknown',
        contact_id: contactMatch.id,
        contact_name: contactMatch.full_name || undefined,
        match_type: 'exact_email',
        match_confidence: 1.0,
      };
      console.log('Found exact email match in contacts:', match);
    }

    // Priority 2: Match via profile email (registered users)
    if (!match) {
      const { data: profileMatch } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          company_id,
          companies!inner(id, name)
        `)
        .eq('email', normalizedEmail)
        .single();

      if (profileMatch && profileMatch.company_id) {
        match = {
          company_id: profileMatch.company_id,
          company_name: (profileMatch.companies as any)?.name || 'Unknown',
          match_type: 'profile',
          match_confidence: 1.0,
        };
        console.log('Found profile email match:', match);
      }
    }

    // Priority 3: Domain match
    if (!match && domain) {
      // Skip blocked/generic domains
      const blockedDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'live.com', 'msn.com'];
      
      if (!blockedDomains.includes(domain)) {
        const { data: domainMatch } = await supabase
          .from('company_domains')
          .select(`
            company_id,
            companies!inner(id, name)
          `)
          .eq('domain', domain)
          .eq('is_blocked', false)
          .single();

        if (domainMatch) {
          match = {
            company_id: domainMatch.company_id,
            company_name: (domainMatch.companies as any)?.name || 'Unknown',
            match_type: 'domain',
            match_confidence: 0.85,
          };
          console.log('Found domain match:', match);
        }
      }
    }

    // Priority 4: Try to extract domain from company website_url
    if (!match && domain) {
      const { data: websiteMatch } = await supabase
        .from('companies')
        .select('id, name, website_url')
        .not('website_url', 'is', null);

      if (websiteMatch) {
        for (const company of websiteMatch) {
          try {
            if (company.website_url) {
              const url = new URL(company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`);
              const websiteDomain = url.hostname.replace('www.', '');
              
              if (websiteDomain === domain) {
                match = {
                  company_id: company.id,
                  company_name: company.name,
                  match_type: 'domain',
                  match_confidence: 0.75,
                };
                
                // Auto-add this domain to company_domains for future matches
                await supabase
                  .from('company_domains')
                  .upsert({
                    company_id: company.id,
                    domain: domain,
                    is_primary: true,
                  }, { onConflict: 'domain' });
                
                console.log('Found website domain match, auto-added domain:', match);
                break;
              }
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        match: match,
        email_address: normalizedEmail,
        domain: domain,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-emails-to-companies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
