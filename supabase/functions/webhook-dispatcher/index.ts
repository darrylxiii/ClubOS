import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch pending webhook deliveries
    const { data: deliveries, error: fetchError } = await supabase
      .from('webhook_deliveries')
      .select(`
        *,
        webhook_endpoints(url, secret, company_id)
      `)
      .eq('status', 'pending')
      .lt('attempts', 3)
      .lte('next_retry_at', new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    console.log(`Processing ${deliveries?.length || 0} webhook deliveries`);

    const results = await Promise.allSettled(
      (deliveries || []).map(async (delivery: any) => {
        const startTime = Date.now();
        
        try {
          // Create HMAC signature
          const encoder = new TextEncoder();
          const keyData = encoder.encode(delivery.webhook_endpoints.secret);
          const messageData = encoder.encode(JSON.stringify(delivery.payload));
          
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          
          const signature = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            messageData
          );
          
          const signatureHex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          // Send webhook
          const response = await fetch(delivery.webhook_endpoints.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signatureHex,
              'X-Webhook-Event': delivery.event_type,
              'X-Webhook-Delivery-ID': delivery.id,
            },
            body: JSON.stringify(delivery.payload),
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });

          const responseBody = await response.text();
          const responseTime = Date.now() - startTime;

          if (response.ok) {
            // Success
            await supabase
              .from('webhook_deliveries')
              .update({
                status: 'success',
                http_status_code: response.status,
                response_body: responseBody.substring(0, 1000),
                delivered_at: new Date().toISOString(),
              })
              .eq('id', delivery.id);

            await supabase
              .from('webhook_endpoints')
              .update({
                last_success_at: new Date().toISOString(),
                consecutive_failures: 0,
              })
              .eq('id', delivery.webhook_id);

            console.log(`✓ Delivered webhook ${delivery.id} (${responseTime}ms)`);
          } else {
            // HTTP error
            throw new Error(`HTTP ${response.status}: ${responseBody}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`✗ Failed webhook ${delivery.id}:`, errorMessage);

          const newAttempts = delivery.attempts + 1;
          const nextRetry = new Date();
          
          // Exponential backoff: 5min, 30min, 2hr
          const retryDelays = [5, 30, 120];
          nextRetry.setMinutes(nextRetry.getMinutes() + retryDelays[newAttempts - 1] || 120);

          await supabase
            .from('webhook_deliveries')
            .update({
              status: newAttempts >= 3 ? 'failed' : 'pending',
              attempts: newAttempts,
              next_retry_at: nextRetry.toISOString(),
              response_body: errorMessage.substring(0, 1000),
            })
            .eq('id', delivery.id);

          await supabase
            .from('webhook_endpoints')
            .update({
              last_failure_at: new Date().toISOString(),
              consecutive_failures: delivery.webhook_endpoints.consecutive_failures + 1,
            })
            .eq('id', delivery.webhook_id);

          // Disable webhook if too many consecutive failures
          if (delivery.webhook_endpoints.consecutive_failures >= 10) {
            await supabase
              .from('webhook_endpoints')
              .update({ is_active: false })
              .eq('id', delivery.webhook_id);
            
            console.log(`⚠️ Disabled webhook ${delivery.webhook_id} due to repeated failures`);
          }
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        processed: deliveries?.length || 0,
        successful,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook dispatcher error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
