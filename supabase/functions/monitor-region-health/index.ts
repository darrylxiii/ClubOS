import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegionHealthCheck {
  region: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  check_type: string;
  error_message?: string;
  metadata: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[REGION-HEALTH] Starting region health monitoring...');
    const healthChecks: RegionHealthCheck[] = [];

    // Check primary region (current instance)
    const primaryStart = Date.now();
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .limit(1);

      const latency = Date.now() - primaryStart;

      healthChecks.push({
        region: 'us-east-1',
        status: error ? 'degraded' : latency < 1000 ? 'healthy' : 'degraded',
        latency_ms: latency,
        check_type: 'database',
        error_message: error?.message,
        metadata: {
          timestamp: new Date().toISOString(),
          query_success: !error,
          response_time_threshold: 1000
        }
      });
    } catch (error) {
      healthChecks.push({
        region: 'us-east-1',
        status: 'down',
        latency_ms: -1,
        check_type: 'database',
        error_message: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
          error_type: 'connection_failure'
        }
      });
    }

    // Check Edge Functions health
    const edgeFunctionStart = Date.now();
    try {
      const healthEndpoint = `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-database-backups`;
      const response = await fetch(healthEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const latency = Date.now() - edgeFunctionStart;

      healthChecks.push({
        region: 'us-east-1',
        status: response.ok ? 'healthy' : 'degraded',
        latency_ms: latency,
        check_type: 'edge_functions',
        error_message: response.ok ? undefined : `HTTP ${response.status}`,
        metadata: {
          timestamp: new Date().toISOString(),
          http_status: response.status,
          function_tested: 'verify-database-backups'
        }
      });
    } catch (error) {
      healthChecks.push({
        region: 'us-east-1',
        status: 'down',
        latency_ms: -1,
        check_type: 'edge_functions',
        error_message: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
          error_type: 'edge_function_failure'
        }
      });
    }

    // Check Storage health
    const storageStart = Date.now();
    try {
      const { data, error } = await supabaseAdmin
        .storage
        .from('profile-images')
        .list('', { limit: 1 });

      const latency = Date.now() - storageStart;

      healthChecks.push({
        region: 'us-east-1',
        status: error ? 'degraded' : 'healthy',
        latency_ms: latency,
        check_type: 'storage',
        error_message: error?.message,
        metadata: {
          timestamp: new Date().toISOString(),
          bucket_accessible: !error
        }
      });
    } catch (error) {
      healthChecks.push({
        region: 'us-east-1',
        status: 'degraded',
        latency_ms: -1,
        check_type: 'storage',
        error_message: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
          error_type: 'storage_check_failure'
        }
      });
    }

    // Insert health checks into database
    for (const check of healthChecks) {
      await supabaseAdmin.from('region_health_checks').insert(check);
    }

    // Check if any critical services are down
    const criticalDown = healthChecks.filter(
      c => c.status === 'down' && ['database', 'edge_functions'].includes(c.check_type)
    );

    if (criticalDown.length > 0) {
      await supabaseAdmin.from('platform_alerts').insert({
        alert_type: 'region_health_critical',
        severity: 'critical',
        message: `Critical services down: ${criticalDown.map(c => c.check_type).join(', ')}`,
        metadata: { failed_checks: criticalDown }
      });

      // Create incident if not already exists
      const { data: existingIncident } = await supabaseAdmin
        .from('incident_logs')
        .select('id')
        .eq('status', 'open')
        .eq('severity', 'P1')
        .single();

      if (!existingIncident) {
        await supabaseAdmin.from('incident_logs').insert({
          incident_id: `INC-${Date.now()}`,
          severity: 'P1',
          title: 'Critical Region Health Failure',
          description: `Services down: ${criticalDown.map(c => c.check_type).join(', ')}`,
          status: 'open',
          detected_by: 'automated_monitoring',
          affected_services: criticalDown.map(c => c.check_type),
          metadata: { health_checks: criticalDown }
        });
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      total_checks: healthChecks.length,
      healthy: healthChecks.filter(c => c.status === 'healthy').length,
      degraded: healthChecks.filter(c => c.status === 'degraded').length,
      down: healthChecks.filter(c => c.status === 'down').length,
      avg_latency_ms: Math.round(
        healthChecks.filter(c => c.latency_ms > 0)
          .reduce((sum, c) => sum + c.latency_ms, 0) / 
        healthChecks.filter(c => c.latency_ms > 0).length
      ),
      checks: healthChecks
    };

    console.log(`[REGION-HEALTH] Check completed: ${JSON.stringify(summary)}`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[REGION-HEALTH] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
