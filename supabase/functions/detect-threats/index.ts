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
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[detect-threats] Starting threat detection scan...');

    // Run brute force detection
    const { data: bruteForceCount, error: bfError } = await supabase.rpc('detect_brute_force_attacks');
    if (bfError) {
      console.error('[detect-threats] Brute force detection error:', bfError);
    } else {
      console.log(`[detect-threats] Detected ${bruteForceCount} brute force attacks`);
    }

    // Run enumeration detection
    const { data: enumCount, error: enumError } = await supabase.rpc('detect_enumeration_attacks');
    if (enumError) {
      console.error('[detect-threats] Enumeration detection error:', enumError);
    } else {
      console.log(`[detect-threats] Detected ${enumCount} enumeration attacks`);
    }

    // Detect rate limit abuse from ai_rate_limits
    const { data: rateLimitAbuse, error: rlError } = await supabase
      .from('ai_rate_limits')
      .select('ip_address, endpoint, request_count')
      .gte('request_count', 100)
      .gte('window_start', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    let rateLimitThreats = 0;
    if (!rlError && rateLimitAbuse?.length > 0) {
      for (const abuse of rateLimitAbuse) {
        // Check if threat already exists
        const { data: existing } = await supabase
          .from('threat_events')
          .select('id')
          .eq('ip_address', abuse.ip_address)
          .eq('event_type', 'rate_abuse')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .single();

        if (!existing) {
          await supabase.from('threat_events').insert({
            event_type: 'rate_abuse',
            severity: abuse.request_count >= 500 ? 'high' : 'medium',
            ip_address: abuse.ip_address,
            description: `Rate limit abuse: ${abuse.request_count} requests to ${abuse.endpoint}`,
            attack_details: {
              endpoint: abuse.endpoint,
              request_count: abuse.request_count,
              detection_time: new Date().toISOString()
            }
          });
          rateLimitThreats++;
        }
      }
    }

    // Clean up expired blocks
    const { error: cleanupError } = await supabase
      .from('blocked_ips')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (cleanupError) {
      console.error('[detect-threats] Block cleanup error:', cleanupError);
    }

    // Get threat summary
    const { data: summary, error: summaryError } = await supabase.rpc('get_threat_summary');

    return new Response(
      JSON.stringify({
        success: true,
        detected: {
          brute_force: bruteForceCount || 0,
          enumeration: enumCount || 0,
          rate_abuse: rateLimitThreats
        },
        summary: summary || {},
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[detect-threats] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Threat detection failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
