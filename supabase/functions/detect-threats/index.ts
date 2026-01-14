import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[detect-threats] Starting comprehensive threat detection scan...');

    const detectionResults: Record<string, number> = {};

    // 1. Run brute force detection
    const { data: bruteForceCount, error: bfError } = await supabase.rpc('detect_brute_force_attacks');
    if (bfError) {
      console.error('[detect-threats] Brute force detection error:', bfError);
    } else {
      detectionResults.brute_force = bruteForceCount || 0;
      console.log(`[detect-threats] Detected ${bruteForceCount} brute force attacks`);
    }

    // 2. Run enumeration detection
    const { data: enumCount, error: enumError } = await supabase.rpc('detect_enumeration_attacks');
    if (enumError) {
      console.error('[detect-threats] Enumeration detection error:', enumError);
    } else {
      detectionResults.enumeration = enumCount || 0;
      console.log(`[detect-threats] Detected ${enumCount} enumeration attacks`);
    }

    // 3. Run credential stuffing detection
    const { data: stuffingCount, error: stuffError } = await supabase.rpc('detect_credential_stuffing');
    if (stuffError) {
      console.error('[detect-threats] Credential stuffing detection error:', stuffError);
    } else {
      detectionResults.credential_stuffing = stuffingCount || 0;
      console.log(`[detect-threats] Detected ${stuffingCount} credential stuffing attacks`);
    }

    // 4. Run impossible travel detection
    const { data: travelCount, error: travelError } = await supabase.rpc('detect_impossible_travel');
    if (travelError) {
      console.error('[detect-threats] Impossible travel detection error:', travelError);
    } else {
      detectionResults.impossible_travel = travelCount || 0;
      console.log(`[detect-threats] Detected ${travelCount} impossible travel events`);
    }

    // 5. Run suspicious login detection
    const { data: suspiciousCount, error: suspiciousError } = await supabase.rpc('detect_suspicious_logins');
    if (suspiciousError) {
      console.error('[detect-threats] Suspicious login detection error:', suspiciousError);
    } else {
      detectionResults.suspicious_login = suspiciousCount || 0;
      console.log(`[detect-threats] Detected ${suspiciousCount} suspicious logins`);
    }

    // 6. Detect rate limit abuse from ai_rate_limits
    const { data: rateLimitAbuse, error: rlError } = await supabase
      .from('ai_rate_limits')
      .select('ip_address, endpoint, request_count')
      .gte('request_count', 100)
      .gte('window_start', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    let rateLimitThreats = 0;
    if (!rlError && rateLimitAbuse?.length > 0) {
      for (const abuse of rateLimitAbuse) {
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
    detectionResults.rate_abuse = rateLimitThreats;

    // 7. Enrich new IPs with geolocation data
    const { data: newIPs } = await supabase
      .from('login_attempts')
      .select('ip_address')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .not('ip_address', 'is', null);

    if (newIPs && newIPs.length > 0) {
      const uniqueIPs = [...new Set(newIPs.map(r => r.ip_address))];
      
      // Check which IPs need enrichment
      const { data: cachedIPs } = await supabase
        .from('ip_geo_cache')
        .select('ip_address')
        .in('ip_address', uniqueIPs)
        .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const cachedSet = new Set(cachedIPs?.map(r => r.ip_address) || []);
      const ipsToEnrich = uniqueIPs.filter(ip => !cachedSet.has(ip));
      
      if (ipsToEnrich.length > 0) {
        console.log(`[detect-threats] Enriching ${ipsToEnrich.length} new IPs`);
        // Trigger geo enrichment asynchronously (don't wait)
        supabase.functions.invoke('enrich-ip-geo', {
          body: { ip_addresses: ipsToEnrich.slice(0, 40) } // Limit to avoid rate limits
        }).catch(err => console.error('[detect-threats] Geo enrichment error:', err));
      }
    }

    // 8. Run auto-response for blocking threats
    console.log('[detect-threats] Triggering automated threat response...');
    supabase.functions.invoke('auto-respond-threats', {}).catch(err => 
      console.error('[detect-threats] Auto-response trigger error:', err)
    );

    // 9. Clean up expired blocks
    const { error: cleanupError } = await supabase
      .from('blocked_ips')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (cleanupError) {
      console.error('[detect-threats] Block cleanup error:', cleanupError);
    }

    // Get threat summary
    const { data: summary } = await supabase.rpc('get_threat_summary');

    const totalDetected = Object.values(detectionResults).reduce((sum, val) => sum + val, 0);
    console.log(`[detect-threats] Scan complete. Total threats detected: ${totalDetected}`);

    return new Response(
      JSON.stringify({
        success: true,
        detected: detectionResults,
        total_detected: totalDetected,
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
