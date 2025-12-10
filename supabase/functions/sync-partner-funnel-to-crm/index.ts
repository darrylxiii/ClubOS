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

    const { partner_request_id, sync_all } = await req.json();

    console.log('[sync-partner-funnel-to-crm] Starting sync', { partner_request_id, sync_all });

    let partnerRequests;

    if (sync_all) {
      // Sync all partner requests that haven't been synced to CRM yet
      const { data, error } = await supabase
        .from('partner_requests')
        .select('*')
        .is('crm_prospect_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      partnerRequests = data;
    } else if (partner_request_id) {
      // Sync specific partner request
      const { data, error } = await supabase
        .from('partner_requests')
        .select('*')
        .eq('id', partner_request_id)
        .single();

      if (error) throw error;
      partnerRequests = data ? [data] : [];
    } else {
      throw new Error('Either partner_request_id or sync_all must be provided');
    }

    console.log(`[sync-partner-funnel-to-crm] Found ${partnerRequests?.length || 0} partner requests to sync`);

    const results = [];

    for (const request of partnerRequests || []) {
      try {
        // Check if prospect already exists with this email
        const { data: existingProspect } = await supabase
          .from('crm_prospects')
          .select('id')
          .eq('email', request.email)
          .single();

        if (existingProspect) {
          console.log(`[sync-partner-funnel-to-crm] Prospect already exists for email: ${request.email}`);
          
          // Link partner request to existing prospect
          await supabase
            .from('partner_requests')
            .update({ crm_prospect_id: existingProspect.id })
            .eq('id', request.id);

          results.push({ 
            partner_request_id: request.id, 
            status: 'linked_existing',
            prospect_id: existingProspect.id 
          });
          continue;
        }

        // Create new CRM prospect from partner request
        const prospectData = {
          email: request.email,
          full_name: request.full_name || request.contact_name || 'Unknown',
          company_name: request.company_name,
          job_title: request.job_title || 'Partner Contact',
          phone: request.phone,
          linkedin_url: request.linkedin_url,
          company_domain: request.company_website ? new URL(request.company_website).hostname : null,
          company_size: request.company_size,
          industry: request.industry,
          stage: 'new' as const,
          source: 'partner_funnel',
          lead_score: 50, // Default score for partner funnel leads
          notes: `Imported from Partner Funnel.\n\nOriginal message: ${request.message || 'N/A'}\nHow they heard about us: ${request.how_heard_about || 'N/A'}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: newProspect, error: prospectError } = await supabase
          .from('crm_prospects')
          .insert(prospectData)
          .select()
          .single();

        if (prospectError) {
          console.error(`[sync-partner-funnel-to-crm] Error creating prospect:`, prospectError);
          results.push({ 
            partner_request_id: request.id, 
            status: 'error',
            error: prospectError.message 
          });
          continue;
        }

        // Link partner request to new prospect
        await supabase
          .from('partner_requests')
          .update({ crm_prospect_id: newProspect.id })
          .eq('id', request.id);

        // Create initial touchpoint activity
        await supabase
          .from('crm_touchpoints')
          .insert({
            prospect_id: newProspect.id,
            type: 'other',
            direction: 'inbound',
            subject: 'Partner Funnel Submission',
            body_preview: request.message?.substring(0, 200) || 'Partner inquiry submitted',
            sentiment: 'positive',
            occurred_at: request.created_at,
          });

        console.log(`[sync-partner-funnel-to-crm] Created prospect ${newProspect.id} for partner request ${request.id}`);

        results.push({ 
          partner_request_id: request.id, 
          status: 'created',
          prospect_id: newProspect.id 
        });

      } catch (itemError: any) {
        console.error(`[sync-partner-funnel-to-crm] Error processing request ${request.id}:`, itemError);
        results.push({ 
          partner_request_id: request.id, 
          status: 'error',
          error: itemError?.message || 'Unknown error'
        });
      }
    }

    console.log('[sync-partner-funnel-to-crm] Sync complete', { 
      total: partnerRequests?.length || 0,
      results 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: results.filter(r => r.status === 'created').length,
        linked: results.filter(r => r.status === 'linked_existing').length,
        errors: results.filter(r => r.status === 'error').length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[sync-partner-funnel-to-crm] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
