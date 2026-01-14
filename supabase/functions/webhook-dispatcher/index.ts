import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { createFunctionLogger, getClientInfo } from '../_shared/function-logger.ts';
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  const logger = createFunctionLogger('webhook-dispatcher');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.logRequest(req.method);
    
    // Rate limiting: 100 requests per hour per IP (webhooks can be frequent)
    const clientInfo = getClientInfo(req);
    
    const rateLimit = await checkUserRateLimit(clientInfo.ip, 'webhook-dispatcher', 100, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      logger.logRateLimit(clientInfo.ip);
      return createRateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }

    // SECURITY: Authenticate request - only internal/cron can trigger
    const authHeader = req.headers.get('Authorization');
    const internalToken = Deno.env.get('WEBHOOK_DISPATCHER_TOKEN');
    
    // Check for internal token or valid JWT
    const token = authHeader?.replace('Bearer ', '');
    if (!token || (internalToken && token !== internalToken)) {
      // If internal token is set, it must match
      // Otherwise, try to validate as user JWT
      if (!internalToken) {
        // No internal token configured, require valid user auth
        const supabaseAuth = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        
        const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
        if (error || !user) {
          logger.warn('Unauthorized webhook dispatch attempt');
          return new Response(
            JSON.stringify({ error: 'Unauthorized - valid authentication required' }),
            { status: 401, headers: corsHeaders }
          );
        }
        
        // Check if user has admin role
        const { data: roles } = await supabaseAuth
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (!roles?.some(r => r.role === 'admin')) {
          logger.warn('Forbidden: User is not admin', { user_id: user.id });
          return new Response(
            JSON.stringify({ error: 'Forbidden - admin access required' }),
            { status: 403, headers: corsHeaders }
          );
        }
      } else {
        logger.warn('Invalid internal token for webhook dispatch');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - invalid token' }),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    logger.checkpoint('authenticated');

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

    logger.info(`Processing ${deliveries?.length || 0} webhook deliveries`);
    logger.checkpoint('fetched_deliveries');

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

            logger.info(`Delivered webhook ${delivery.id}`, { responseTime_ms: responseTime });
          } else {
            // HTTP error
            throw new Error(`HTTP ${response.status}: ${responseBody}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.warn(`Failed webhook ${delivery.id}`, { error: errorMessage });

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
            
            logger.warn(`Disabled webhook ${delivery.webhook_id} due to repeated failures`);
          }
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.logSuccess(200, { processed: deliveries?.length || 0, successful, failed });

    return new Response(
      JSON.stringify({
        processed: deliveries?.length || 0,
        successful,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.logError(500, errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
