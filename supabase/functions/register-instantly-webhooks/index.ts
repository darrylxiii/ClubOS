import { createAuthenticatedHandler } from '../_shared/handler.ts';
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  INSTANTLY_WEBHOOK_EVENTS,
  type InstantlyWebhookEvent
} from "../_shared/instantly-client.ts";

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const supabase = ctx.supabase;

    const body = await req.json().catch(() => ({}));
    const { action = 'register', campaign_id, event_types } = body;

    // Build webhook URL - use the Supabase project URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/instantly-webhook-receiver`;

    console.log(`[register-instantly-webhooks] Action: ${action}, URL: ${webhookUrl}`);

    if (action === 'list') {
      // List existing webhooks
      const response = await listWebhooks();
      
      if (response.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to list webhooks', details: response.error }),
          { status: 500, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ webhooks: response.data?.items || [] }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
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
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 500, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
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
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: register, unregister, or list' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
