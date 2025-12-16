import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  database_id: string;
  data: any;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { webhook_id, event, database_id, data, retry = false } = body;

    console.log(`[Webhook Dispatcher] Processing ${event} for database ${database_id}`);

    // Get webhook configuration
    let webhooks;
    
    if (webhook_id) {
      // Retry specific webhook
      const { data: webhook, error } = await supabase
        .from('workspace_webhooks')
        .select('*')
        .eq('id', webhook_id)
        .eq('is_active', true)
        .single();
      
      if (error || !webhook) {
        return new Response(JSON.stringify({ error: 'Webhook not found or inactive' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      webhooks = [webhook];
    } else {
      // Get all active webhooks for this database and event
      const { data: activeWebhooks, error } = await supabase
        .from('workspace_webhooks')
        .select('*')
        .eq('database_id', database_id)
        .eq('is_active', true)
        .contains('events', [event]);

      if (error) throw error;
      webhooks = activeWebhooks || [];
    }

    if (!webhooks.length) {
      return new Response(JSON.stringify({ 
        message: 'No webhooks configured for this event',
        dispatched: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const webhook of webhooks) {
      const payload: WebhookPayload = {
        event,
        database_id,
        data,
        timestamp: new Date().toISOString()
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Quantum-Workspace-Webhook/1.0'
      };

      // Add secret header if configured
      if (webhook.secret) {
        headers['X-Webhook-Secret'] = webhook.secret;
      }

      const startTime = Date.now();
      let statusCode = 0;
      let success = false;
      let errorMessage: string | null = null;
      let responseBody: string | null = null;

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        statusCode = response.status;
        success = response.ok;
        
        try {
          responseBody = await response.text();
        } catch {
          responseBody = null;
        }

        if (!response.ok) {
          errorMessage = `HTTP ${response.status}: ${responseBody?.substring(0, 200)}`;
        }
      } catch (error: unknown) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Webhook Error] ${webhook.url}:`, error);
      }

      const duration = Date.now() - startTime;

      // Log the webhook delivery
      await supabase.from('workspace_webhook_logs').insert({
        webhook_id: webhook.id,
        event,
        payload,
        status_code: statusCode,
        response_body: responseBody?.substring(0, 5000),
        success,
        error_message: errorMessage,
        duration_ms: duration
      });

      // Update webhook last_triggered
      await supabase
        .from('workspace_webhooks')
        .update({ 
          last_triggered_at: new Date().toISOString(),
          consecutive_failures: success ? 0 : (webhook.consecutive_failures || 0) + 1
        })
        .eq('id', webhook.id);

      // Auto-disable webhook after 10 consecutive failures
      if (!success && (webhook.consecutive_failures || 0) >= 9) {
        console.log(`[Webhook] Auto-disabling webhook ${webhook.id} after 10 consecutive failures`);
        await supabase
          .from('workspace_webhooks')
          .update({ is_active: false })
          .eq('id', webhook.id);
      }

      results.push({
        webhook_id: webhook.id,
        url: webhook.url,
        success,
        status_code: statusCode,
        duration_ms: duration,
        error: errorMessage
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Webhook Dispatcher] Dispatched ${successCount}/${results.length} webhooks successfully`);

    return new Response(JSON.stringify({
      dispatched: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook Dispatcher Error]', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
