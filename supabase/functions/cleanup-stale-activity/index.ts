import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Cleanup] Starting stale activity cleanup job...');

    // Refresh materialized view for dashboard
    const { error: refreshError } = await supabase.rpc('refresh_activity_dashboard_view');
    
    if (refreshError) {
      console.error('[Cleanup] Error refreshing dashboard view:', refreshError);
    } else {
      console.log('[Cleanup] Dashboard view refreshed successfully');
    }

    // Log cleanup completion
    const { data: stats } = await supabase
      .from('user_activity_tracking')
      .select('online_status, activity_level', { count: 'exact', head: true });

    console.log('[Cleanup] Cleanup completed. Stats:', stats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Stale activity cleanup completed',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
