import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (_req, ctx) => {
    console.log('[Cleanup] Starting stale activity cleanup job...');

    // Refresh materialized view for dashboard
    const { error: refreshError } = await ctx.supabase.rpc('refresh_activity_dashboard_view');

    if (refreshError) {
      console.error('[Cleanup] Error refreshing dashboard view:', refreshError);
    } else {
      console.log('[Cleanup] Dashboard view refreshed successfully');
    }

    // Log cleanup completion
    const { data: stats } = await ctx.supabase
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
}));
