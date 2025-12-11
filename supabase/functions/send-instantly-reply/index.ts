import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendReply, listEmails, getLeadByEmail } from "../_shared/instantly-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { prospect_id, subject, body: emailBody, get_thread } = body;

    if (!prospect_id) {
      return new Response(
        JSON.stringify({ error: 'prospect_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get prospect details
    const { data: prospect, error: prospectError } = await supabase
      .from('crm_prospects')
      .select('id, email, instantly_lead_id, campaign_id, campaign:crm_campaigns(external_id)')
      .eq('id', prospect_id)
      .single();

    if (prospectError || !prospect) {
      return new Response(
        JSON.stringify({ error: 'Prospect not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or find Instantly lead ID
    let leadId = prospect.instantly_lead_id;
    
    if (!leadId) {
      // Try to find lead in Instantly by email
      const campaignData = prospect.campaign as unknown as Array<{ external_id: string }>;
      const externalId = Array.isArray(campaignData) ? campaignData[0]?.external_id : null;
      const leadResponse = await getLeadByEmail(prospect.email, externalId || undefined);
      
      if (leadResponse.data?.id) {
        leadId = leadResponse.data.id;
        // Update prospect with lead ID
        await supabase
          .from('crm_prospects')
          .update({ instantly_lead_id: leadId })
          .eq('id', prospect_id);
      }
    }

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead not found in Instantly. Prospect may not be part of an Instantly campaign.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If just getting email thread
    if (get_thread) {
      const emailsResponse = await listEmails(leadId, { limit: 50 });
      
      if (emailsResponse.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch emails', details: emailsResponse.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ emails: emailsResponse.data?.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send reply
    if (!emailBody) {
      return new Response(
        JSON.stringify({ error: 'Email body is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const replyResponse = await sendReply({
      lead_id: leadId,
      body: emailBody,
      subject: subject,
    });

    if (replyResponse.error) {
      return new Response(
        JSON.stringify({ error: 'Failed to send reply', details: replyResponse.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log activity in CRM
    await supabase
      .from('crm_prospect_activities')
      .insert({
        prospect_id,
        activity_type: 'email_sent',
        subject: subject || 'Reply',
        content: emailBody,
        performed_by: user.id,
        source: 'crm_reply',
      });

    // Update prospect
    await supabase
      .from('crm_prospects')
      .update({
        last_contacted_at: new Date().toISOString(),
        emails_sent: (prospect as any).emails_sent ? (prospect as any).emails_sent + 1 : 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prospect_id);

    // Store in email threads
    await supabase
      .from('crm_email_threads')
      .upsert({
        prospect_id,
        campaign_id: prospect.campaign_id,
        instantly_thread_id: replyResponse.data?.thread_id,
        subject: subject || 'Reply',
        last_message_at: new Date().toISOString(),
        message_count: 1,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'prospect_id,campaign_id',
        ignoreDuplicates: false,
      });

    console.log(`[send-instantly-reply] Reply sent to ${prospect.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: replyResponse.data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-instantly-reply] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
