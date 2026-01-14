import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { 
  listWebhooks, 
  createWebhook, 
  deleteWebhook, 
  INSTANTLY_WEBHOOK_EVENTS,
  type InstantlyWebhookEvent 
} from "../_shared/instantly-client.ts";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

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

    const body = await req.json().catch(() => ({}));
    const { action = 'register', campaign_id, event_types } = body;

    // Build webhook URL - use the Supabase project URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/instantly-webhook-receiver`;

    console.log(`[register-instantly-webhooks] Action: ${action}, URL: ${webhookUrl}`);

    if (action === 'list') {
      // List existing webhooks
      const response = await listWebhooks();
      
      if (response.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to list webhooks', details: response.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ webhooks: response.data?.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'unregister') {
      // Delete existing webhooks for our URL
      const listResponse = await listWebhooks();
      const webhooks = listResponse.data?.items || [];
      
      let deleted = 0;
      for (const webhook of webhooks) {
        if (webhook.url === webhookUrl) {
          await deleteWebhook(webhook.id);
          deleted++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, deleted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'register') {
      // First, check for existing webhooks with our URL
      const listResponse = await listWebhooks();
      const existingWebhooks = listResponse.data?.items || [];
      const ourWebhooks = existingWebhooks.filter(w => w.url === webhookUrl);

      // Delete existing if any
      for (const webhook of ourWebhooks) {
        console.log(`[register-instantly-webhooks] Deleting existing webhook: ${webhook.id}`);
        await deleteWebhook(webhook.id);
      }

      // Determine events to register
      const eventsToRegister: InstantlyWebhookEvent[] = event_types || [
        'lead.replied',
        'lead.interested',
        'lead.not_interested',
        'lead.meeting_booked',
        'lead.meeting_completed',
        'lead.wrong_person',
        'lead.out_of_office',
        'email.sent',
        'email.opened',
        'email.clicked',
        'email.bounced',
        'email.unsubscribed',
      ];

      // Register new webhook
      const response = await createWebhook({
        url: webhookUrl,
        event_types: eventsToRegister,
        campaign_id: campaign_id,
      });

      if (response.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to register webhook', details: response.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store webhook ID in database for reference
      if (response.data?.id) {
        const { error: storeErr } = await supabase
          .from('crm_integration_settings')
          .upsert({
            integration: 'instantly',
            setting_key: 'webhook_id',
            setting_value: response.data.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'integration,setting_key' });
        
        if (storeErr) {
          console.error('[register-instantly-webhooks] Failed to store webhook ID:', storeErr);
        }
      }

      console.log(`[register-instantly-webhooks] Webhook registered: ${response.data?.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          webhook: response.data,
          events_registered: eventsToRegister,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: register, unregister, or list' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[register-instantly-webhooks] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
