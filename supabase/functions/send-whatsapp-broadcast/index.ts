import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface BroadcastRequest {
  campaignId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappAccessToken || !phoneNumberId) {
      throw new Error('WhatsApp API credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { campaignId }: BroadcastRequest = await req.json();

    // Get campaign with template
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .select(`
        *,
        whatsapp_templates(*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign cannot be started - invalid status');
    }

    const template = campaign.whatsapp_templates;
    if (!template || template.approval_status !== 'APPROVED') {
      throw new Error('Campaign template not approved');
    }

    // Update campaign status to sending
    await supabase
      .from('whatsapp_broadcast_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('whatsapp_broadcast_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (recipientsError) {
      throw recipientsError;
    }

    console.log(`Starting broadcast for campaign ${campaignId} with ${recipients?.length || 0} recipients`);

    let sentCount = 0;
    let failedCount = 0;

    // Process recipients in batches to respect rate limits
    const batchSize = 50;
    const delayBetweenMessages = 100; // ms

    for (let i = 0; i < (recipients?.length || 0); i += batchSize) {
      const batch = recipients!.slice(i, i + batchSize);

      for (const recipient of batch) {
        try {
          // Build template message
          const messagePayload = {
            messaging_product: 'whatsapp',
            to: recipient.phone_number.replace(/[^0-9]/g, ''),
            type: 'template',
            template: {
              name: template.template_name,
              language: { code: template.language_code || 'en' },
              components: recipient.template_params ? [
                {
                  type: 'body',
                  parameters: Object.values(recipient.template_params).map((value: any) => ({
                    type: 'text',
                    text: value
                  }))
                }
              ] : []
            }
          };

          // Send message
          const waResponse = await fetch(
            `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${whatsappAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(messagePayload),
            }
          );

          const waResult = await waResponse.json();

          if (waResponse.ok) {
            const waMessageId = waResult.messages?.[0]?.id;

            // Get or create conversation
            let { data: conversation } = await supabase
              .from('whatsapp_conversations')
              .select('id')
              .eq('account_id', campaign.account_id)
              .eq('candidate_phone', recipient.phone_number)
              .single();

            if (!conversation) {
              const { data: newConv } = await supabase
                .from('whatsapp_conversations')
                .insert({
                  account_id: campaign.account_id,
                  candidate_id: recipient.candidate_id,
                  candidate_phone: recipient.phone_number,
                  conversation_status: 'active'
                })
                .select('id')
                .single();
              conversation = newConv;
            }

            // Create message record
            const { data: message } = await supabase
              .from('whatsapp_messages')
              .insert({
                account_id: campaign.account_id,
                conversation_id: conversation?.id,
                candidate_id: recipient.candidate_id,
                direction: 'outbound',
                message_type: 'template',
                wa_message_id: waMessageId,
                template_name: template.template_name,
                template_params: recipient.template_params,
                status: 'sent',
                sent_by: user.id,
                is_automated: true,
                automation_trigger: `broadcast_campaign:${campaignId}`
              })
              .select('id')
              .single();

            // Update recipient status
            await supabase
              .from('whatsapp_broadcast_recipients')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                message_id: message?.id
              })
              .eq('id', recipient.id);

            sentCount++;
          } else {
            const errorMessage = waResult.error?.message || 'Unknown error';
            
            await supabase
              .from('whatsapp_broadcast_recipients')
              .update({
                status: 'failed',
                error_message: errorMessage
              })
              .eq('id', recipient.id);

            failedCount++;
            console.error(`Failed to send to ${recipient.phone_number}:`, errorMessage);
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));

        } catch (error: unknown) {
          console.error(`Error sending to ${recipient.phone_number}:`, error);
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          
          await supabase
            .from('whatsapp_broadcast_recipients')
            .update({
              status: 'failed',
              error_message: errMsg
            })
            .eq('id', recipient.id);

          failedCount++;
        }
      }
    }

    // Update campaign with final counts
    await supabase
      .from('whatsapp_broadcast_campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq('id', campaignId);

    console.log(`Broadcast completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        failedCount,
        totalRecipients: recipients?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in broadcast:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
