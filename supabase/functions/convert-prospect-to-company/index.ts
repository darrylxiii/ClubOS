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

    // Get the user from the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prospect_id, company_data, create_partner_user } = await req.json();

    if (!prospect_id) {
      return new Response(
        JSON.stringify({ error: 'prospect_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[convert-prospect-to-company] Starting conversion', { prospect_id, create_partner_user });

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

    // Check if company already exists with this domain
    let existingCompany = null;
    if (prospect.company_domain) {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('domain', prospect.company_domain)
        .single();
      existingCompany = data;
    }

    let companyId: string;
    let companyName: string;

    if (existingCompany) {
      console.log('[convert-prospect-to-company] Company already exists:', existingCompany.id);
      companyId = existingCompany.id;
      companyName = existingCompany.name;
    } else {
      // Create new company
      const newCompanyData = {
        name: company_data?.name || prospect.company_name || 'Unknown Company',
        domain: prospect.company_domain,
        industry: company_data?.industry || prospect.industry,
        size: company_data?.size || prospect.company_size,
        website: prospect.company_domain ? `https://${prospect.company_domain}` : null,
        description: company_data?.description || null,
        logo_url: company_data?.logo_url || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(newCompanyData)
        .select()
        .single();

      if (companyError) {
        console.error('[convert-prospect-to-company] Error creating company:', companyError);
        return new Response(
          JSON.stringify({ error: 'Failed to create company', details: companyError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      companyId = newCompany.id;
      companyName = newCompany.name;
      console.log('[convert-prospect-to-company] Created company:', companyId);
    }

    // Update prospect with company link and close as won
    const { error: updateError } = await supabase
      .from('crm_prospects')
      .update({
        stage: 'closed_won',
        closed_at: new Date().toISOString(),
        closed_reason: 'Converted to Partner',
        closed_reason_category: 'won',
        converted_company_id: companyId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prospect_id);

    if (updateError) {
      console.error('[convert-prospect-to-company] Error updating prospect:', updateError);
    }

    // Create activity log
    await supabase
      .from('crm_touchpoints')
      .insert({
        prospect_id,
        type: 'other',
        direction: 'outbound',
        subject: 'Converted to Partner Company',
        body_preview: `Prospect converted to company: ${companyName}`,
        sentiment: 'positive',
        occurred_at: new Date().toISOString(),
      });

    // Optionally create partner user account
    let partnerUserId = null;
    if (create_partner_user && prospect.email) {
      // Create a profile for the partner contact
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: prospect.email,
          full_name: prospect.full_name,
          company_id: companyId,
          phone: prospect.phone,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!profileError && profile) {
        partnerUserId = profile.id;

        // Assign partner role
        await supabase
          .from('user_roles')
          .insert({
            user_id: profile.id,
            role: 'partner',
            assigned_at: new Date().toISOString(),
            assigned_by: user.id,
          });

        console.log('[convert-prospect-to-company] Created partner user:', partnerUserId);
      }
    }

    console.log('[convert-prospect-to-company] Conversion complete', { 
      prospect_id, 
      company_id: companyId,
      partner_user_id: partnerUserId 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        company_id: companyId,
        company_name: companyName,
        partner_user_id: partnerUserId,
        was_existing_company: !!existingCompany
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[convert-prospect-to-company] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
