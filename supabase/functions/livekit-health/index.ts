/**
 * LiveKit Health Check Endpoint
 * Tests if LiveKit infrastructure is configured and reachable
 */
import { createHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { corsHeaders } = ctx;

  console.log('[LiveKit Health] Health check requested at:', new Date().toISOString());

  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  const livekitUrl = Deno.env.get('LIVEKIT_URL');

  const health = {
    timestamp: new Date().toISOString(),
    configured: !!(apiKey && apiSecret && livekitUrl),
    livekitUrl: livekitUrl || null,
    ready: false,
    latencyMs: null as number | null,
    error: null as string | null
  };

  // Test if LiveKit cloud is reachable
  if (health.configured && livekitUrl) {
    try {
      const startTime = Date.now();

      // Try the WebSocket endpoint health check
      // LiveKit cloud uses WSS, so we check if the domain resolves
      const { response } = await resilientFetch(
        `${livekitUrl.replace('wss://', 'https://')}`,
        { method: 'GET' },
        {
          timeoutMs: 5_000,
          maxRetries: 2, // 1 initial + 1 retry
          service: 'livekit',
          operation: 'health-check',
        },
      );

      health.latencyMs = Date.now() - startTime;
      health.ready = response.status < 500; // Any non-500 response means server is up
      
      console.log('[LiveKit Health] ✅ Reachability check:', {
        status: response.status,
        latencyMs: health.latencyMs
      });
    } catch (error) {
      health.ready = false;
      health.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LiveKit Health] ❌ Reachability check failed:', health.error);
    }
  } else {
    health.error = 'LiveKit not configured';
  }

  return new Response(JSON.stringify(health), {
    status: health.ready ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}));
