import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    console.log('[cleanup-monitoring-data] Starting scheduled cleanup...');

    const results: Record<string, number> = {};

    // 1. Truncate region_health_checks (no production value)
    const { count: rhc } = await supabase
      .from('region_health_checks')
      .select('*', { count: 'exact', head: true });
    if (rhc && rhc > 0) {
      const { error } = await supabase.from('region_health_checks').delete().lt('checked_at', new Date().toISOString());
      results['region_health_checks'] = rhc;
      if (error) console.error('[cleanup] region_health_checks error:', error.message);
    }

    // 2. Purge webrtc_signals older than 7 days
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: wrtc } = await supabase
      .from('webrtc_signals')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff7d);
    if (wrtc && wrtc > 0) {
      await supabase.from('webrtc_signals').delete().lt('created_at', cutoff7d);
      results['webrtc_signals'] = wrtc;
    }

    // 3. Purge user_session_events older than 30 days
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: use } = await supabase
      .from('user_session_events')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff30d);
    if (use && use > 0) {
      await supabase.from('user_session_events').delete().lt('created_at', cutoff30d);
      results['user_session_events'] = use;
    }

    // 4. Purge backup_verification_logs older than 7 days
    const { count: bvl } = await supabase
      .from('backup_verification_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff7d);
    if (bvl && bvl > 0) {
      await supabase.from('backup_verification_logs').delete().lt('created_at', cutoff7d);
      results['backup_verification_logs'] = bvl;
    }

    // 5. Purge user_frustration_signals older than 30 days
    const { count: ufs } = await supabase
      .from('user_frustration_signals')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff30d);
    if (ufs && ufs > 0) {
      await supabase.from('user_frustration_signals').delete().lt('created_at', cutoff30d);
      results['user_frustration_signals'] = ufs;
    }

    // 6. Purge user_page_analytics older than 30 days
    const { count: upa } = await supabase
      .from('user_page_analytics')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff30d);
    if (upa && upa > 0) {
      await supabase.from('user_page_analytics').delete().lt('created_at', cutoff30d);
      results['user_page_analytics'] = upa;
    }

    // 7. Purge user_device_info older than 30 days (keep latest per user)
    const { count: udi } = await supabase
      .from('user_device_info')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff30d);
    if (udi && udi > 0) {
      await supabase.from('user_device_info').delete().lt('created_at', cutoff30d);
      results['user_device_info'] = udi;
    }

    console.log('[cleanup-monitoring-data] Cleanup complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        purged_rows: results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[cleanup-monitoring-data] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
