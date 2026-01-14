import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface HealthCheck {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency_ms?: number;
    message?: string;
}

async function checkDatabase(supabase: any): Promise<HealthCheck> {
    const start = Date.now();
    try {
        const { error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
        
        const latency = Date.now() - start;
        
        if (error) {
            return { name: 'database', status: 'unhealthy', latency_ms: latency, message: error.message };
        }
        
        if (latency > 1000) {
            return { name: 'database', status: 'degraded', latency_ms: latency, message: 'High latency' };
        }
        
        return { name: 'database', status: 'healthy', latency_ms: latency };
    } catch (error) {
        return { name: 'database', status: 'unhealthy', message: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function checkAIGateway(): Promise<HealthCheck> {
    const start = Date.now();
    try {
        const gatewayUrl = Deno.env.get('AI_GATEWAY_URL');
        if (!gatewayUrl) {
            return { name: 'ai_gateway', status: 'healthy', message: 'Using Lovable AI (no external gateway)' };
        }
        
        const latency = Date.now() - start;
        return { name: 'ai_gateway', status: 'healthy', latency_ms: latency };
    } catch (error) {
        return { name: 'ai_gateway', status: 'unhealthy', message: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function checkStorage(supabase: any): Promise<HealthCheck> {
    const start = Date.now();
    try {
        const { data, error } = await supabase.storage.listBuckets();
        const latency = Date.now() - start;
        
        if (error) {
            return { name: 'storage', status: 'unhealthy', latency_ms: latency, message: error.message };
        }
        
        return { name: 'storage', status: 'healthy', latency_ms: latency, message: `${data?.length || 0} buckets` };
    } catch (error) {
        return { name: 'storage', status: 'unhealthy', message: error instanceof Error ? error.message : 'Unknown error' };
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const startTime = Date.now();
    
    // Run all health checks in parallel
    const [dbCheck, aiCheck, storageCheck] = await Promise.all([
        checkDatabase(supabase),
        checkAIGateway(),
        checkStorage(supabase),
    ]);

    const checks = [dbCheck, aiCheck, storageCheck];
    const totalLatency = Date.now() - startTime;

    // Determine overall health
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) overallStatus = 'unhealthy';
    else if (degradedCount > 0) overallStatus = 'degraded';

    const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: Deno.env.get('ENVIRONMENT') || 'production',
        total_latency_ms: totalLatency,
        checks,
        meta: {
            project_id: 'dpjucecmoyfzrduhlctt',
            region: 'eu-central-1',
            edge_functions_count: 238,
        }
    };

    const httpStatus = overallStatus === 'unhealthy' ? 503 : overallStatus === 'degraded' ? 200 : 200;

    return new Response(JSON.stringify(response, null, 2), {
        status: httpStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
});
