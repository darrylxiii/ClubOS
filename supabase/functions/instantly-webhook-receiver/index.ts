import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-instantly-signature',
};

interface WebhookPayload {
  event_type: string;
  data: {
    lead_id?: string;
    email?: string;
    campaign_id?: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    subject?: string;
    body?: string;
    reply_body?: string;
    sent_at?: string;
    opened_at?: string;
    clicked_at?: string;
    replied_at?: string;
    bounced_at?: string;
    unsubscribed_at?: string;
    meeting_link?: string;
    meeting_time?: string;
    [key: string]: unknown;
  };
  timestamp: string;
}

// Map webhook events to CRM stages
function getStageFromEvent(eventType: string): string | null {
  const stageMap: Record<string, string> = {
    'lead.replied': 'replied',
    'lead.interested': 'qualified',
    'lead.meeting_booked': 'meeting_booked',
    'lead.meeting_completed': 'demo_completed',
    'lead.not_interested': 'closed_lost',
    'lead.wrong_person': 'closed_lost',
    'email.bounced': 'closed_lost',
    'email.unsubscribed': 'unsubscribed',
    'email.sent': 'contacted',
    'email.opened': 'opened',
  };
  return stageMap[eventType] || null;
}

// Check if event should create a Club Pilot task
function shouldCreateTask(eventType: string): { create: boolean; priority: string; title: string } | null {
  const taskMap: Record<string, { priority: string; title: string }> = {
    'lead.replied': { priority: 'high', title: 'Follow up on email reply' },
    'lead.interested': { priority: 'high', title: 'Hot lead - Follow up immediately' },
    'lead.meeting_booked': { priority: 'high', title: 'Prepare for upcoming meeting' },
    'lead.not_interested': { priority: 'low', title: 'Review objection and update notes' },
  };
  
  const config = taskMap[eventType];
  return config ? { create: true, ...config } : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let payload: WebhookPayload;
  
  try {
    payload = await req.json();
    console.log('[instantly-webhook] Received:', payload.event_type, payload.data?.email);
  } catch (err) {
    console.error('[instantly-webhook] Invalid JSON:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log webhook for debugging
  const { error: logErr } = await supabase
    .from('instantly_webhook_logs')
    .insert({
      event_type: payload.event_type,
      payload: payload,
      processed: false,
    });
  
  if (logErr) {
    console.error('[instantly-webhook] Failed to log webhook:', logErr);
  }

  try {
    const { event_type, data } = payload;
    const email = data.email?.toLowerCase().trim();

    if (!email) {
      console.log('[instantly-webhook] No email in payload, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'No email in payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the prospect in CRM
    const { data: prospect } = await supabase
      .from('crm_prospects')
      .select('id, owner_id, campaign_id, stage, emails_sent, emails_opened, emails_clicked, emails_replied')
      .eq('email', email)
      .maybeSingle();

    if (!prospect) {
      console.log(`[instantly-webhook] Prospect not found for email: ${email}`);
      
      // Create new prospect if it's a lead event
      if (event_type.startsWith('lead.') || event_type.startsWith('email.')) {
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || email.split('@')[0];
        
        const { data: crmCampaign } = await supabase
          .from('crm_campaigns')
          .select('id')
          .eq('external_id', data.campaign_id)
          .maybeSingle();

        await supabase
          .from('crm_prospects')
          .insert({
            email,
            first_name: data.first_name,
            last_name: data.last_name,
            full_name: fullName,
            company_name: data.company_name,
            instantly_lead_id: data.lead_id,
            campaign_id: crmCampaign?.id,
            source: 'instantly',
            stage: getStageFromEvent(event_type) || 'new',
          });
        
        console.log(`[instantly-webhook] Created new prospect for: ${email}`);
      }

      // Update webhook log as processed
      await supabase
        .from('instantly_webhook_logs')
        .update({ processed: true })
        .eq('event_type', event_type)
        .eq('payload->data->email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      return new Response(
        JSON.stringify({ success: true, message: 'Prospect created' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update prospect based on event type
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const newStage = getStageFromEvent(event_type);
    if (newStage) {
      updates.stage = newStage;
    }

    // Handle specific event types
    switch (event_type) {
      case 'email.sent':
        updates.emails_sent = (prospect.emails_sent || 0) + 1;
        updates.last_contacted_at = data.sent_at || new Date().toISOString();
        break;
      
      case 'email.opened':
        updates.emails_opened = (prospect.emails_opened || 0) + 1;
        updates.last_opened_at = data.opened_at || new Date().toISOString();
        break;
      
      case 'email.clicked':
        updates.emails_clicked = (prospect.emails_clicked || 0) + 1;
        updates.last_clicked_at = data.clicked_at || new Date().toISOString();
        break;
      
      case 'lead.replied':
        updates.emails_replied = (prospect.emails_replied || 0) + 1;
        updates.last_replied_at = data.replied_at || new Date().toISOString();
        // Store reply content
        if (data.reply_body) {
          await supabase
            .from('crm_prospect_activities')
            .insert({
              prospect_id: prospect.id,
              activity_type: 'email_reply',
              subject: data.subject || 'Reply',
              content: data.reply_body,
              source: 'instantly_webhook',
            });
        }
        break;
      
      case 'email.bounced':
        updates.email_status = 'bounced';
        updates.bounced_at = data.bounced_at || new Date().toISOString();
        // Add to suppression list
        await supabase
          .from('crm_suppression_list')
          .upsert({
            email,
            reason: 'bounced',
            source: 'instantly',
          }, { onConflict: 'email' });
        break;
      
      case 'email.unsubscribed':
        updates.email_status = 'unsubscribed';
        updates.unsubscribed_at = data.unsubscribed_at || new Date().toISOString();
        // Add to suppression list
        await supabase
          .from('crm_suppression_list')
          .upsert({
            email,
            reason: 'unsubscribed',
            source: 'instantly',
          }, { onConflict: 'email' });
        break;
      
      case 'lead.interested':
        updates.is_interested = true;
        updates.interest_indicated_at = new Date().toISOString();
        break;
      
      case 'lead.meeting_booked':
        updates.meeting_booked_at = data.meeting_time || new Date().toISOString();
        if (data.meeting_link) {
          updates.meeting_link = data.meeting_link;
        }
        break;
      
      case 'lead.not_interested':
      case 'lead.wrong_person':
        updates.closed_at = new Date().toISOString();
        updates.closed_reason = event_type === 'lead.wrong_person' ? 'Wrong contact' : 'Not interested';
        updates.closed_reason_category = 'not_a_fit';
        break;
    }

    // Update prospect
    const { error: updateError } = await supabase
      .from('crm_prospects')
      .update(updates)
      .eq('id', prospect.id);

    if (updateError) {
      console.error('[instantly-webhook] Failed to update prospect:', updateError);
    }

    // Create Club Pilot task if needed
    const taskConfig = shouldCreateTask(event_type);
    if (taskConfig?.create && prospect.owner_id) {
      const { error: taskErr } = await supabase
        .from('pilot_tasks')
        .insert({
          user_id: prospect.owner_id,
          title: taskConfig.title,
          description: `Prospect: ${email}\nEvent: ${event_type}`,
          category: 'crm',
          priority_score: taskConfig.priority === 'high' ? 90 : 50,
          status: 'pending',
          related_entity_type: 'crm_prospect',
          related_entity_id: prospect.id,
        });
      
      if (taskErr) {
        console.error('[instantly-webhook] Failed to create task:', taskErr);
      }
    }

    // Log activity
    const { error: activityErr } = await supabase
      .from('crm_prospect_activities')
      .insert({
        prospect_id: prospect.id,
        activity_type: event_type.replace('.', '_'),
        content: JSON.stringify(data),
        source: 'instantly_webhook',
      });
    
    if (activityErr) {
      console.error('[instantly-webhook] Failed to log activity:', activityErr);
    }

    // Update webhook log as processed
    await supabase
      .from('instantly_webhook_logs')
      .update({ processed: true })
      .eq('event_type', event_type)
      .eq('payload->data->email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`[instantly-webhook] Processed ${event_type} for ${email}`);

    return new Response(
      JSON.stringify({ success: true, prospect_id: prospect.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[instantly-webhook] Error processing webhook:', error);
    
    // Log error
    await supabase
      .from('instantly_webhook_logs')
      .update({ 
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('event_type', payload.event_type)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({ error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
