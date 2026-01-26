/**
 * LiveKit Health Check Endpoint
 * Tests if LiveKit infrastructure is configured and reachable
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[LiveKit Health] 🏥 Health check requested at:', new Date().toISOString());

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
      const response = await fetch(`${livekitUrl.replace('wss://', 'https://')}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
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
});
