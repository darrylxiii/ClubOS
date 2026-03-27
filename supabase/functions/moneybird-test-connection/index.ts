import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resilientFetch } from '../_shared/resilient-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MONEYBIRD_ACCESS_TOKEN');
    const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID');

    if (!accessToken || !administrationId) {
      console.log('[Moneybird Test] Missing credentials');
      return new Response(
        JSON.stringify({
          connected: false,
          error: 'Moneybird credentials not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test the connection by fetching administration details
    // Note: This endpoint (/{administrationId}.json) sits outside the standard
    // /{administrationId}/{resource} pattern, so we use resilientFetch directly.
    const { response } = await resilientFetch(
      `${MONEYBIRD_API_BASE}/${administrationId}.json`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      },
      {
        timeoutMs: 15_000,
        maxRetries: 2,
        service: 'moneybird',
        operation: 'test-connection',
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Moneybird Test] API error:', response.status, errorText);
      return new Response(
        JSON.stringify({
          connected: false,
          error: `API error: ${response.status}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const administration = await response.json();
    console.log('[Moneybird Test] Connected to:', administration.name);

    return new Response(
      JSON.stringify({
        connected: true,
        administrationId: administration.id,
        administrationName: administration.name,
        country: administration.country,
        currency: administration.currency,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Moneybird Test] Error:', error);
    return new Response(
      JSON.stringify({
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
