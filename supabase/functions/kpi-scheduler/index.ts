import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalculationResult {
  function_name: string;
  success: boolean;
  metrics_count?: number;
  error?: string;
  duration_ms: number;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[KPI-SCHEDULER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      full_recalc = false, 
      domains = ['operations', 'sales', 'website', 'financial'],
      period = 'daily'
    } = body;

    logStep('Starting KPI calculation orchestration', { full_recalc, domains, period });

    const results: CalculationResult[] = [];

    // Helper to call edge functions
    const callEdgeFunction = async (functionName: string, payload: Record<string, unknown> = {}): Promise<CalculationResult> => {
      const fnStart = Date.now();
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        return {
          function_name: functionName,
          success: true,
          metrics_count: data.metricsCount || data.kpis_calculated || data.metrics?.length || 0,
          duration_ms: Date.now() - fnStart,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logStep(`Error calling ${functionName}`, { error: errorMessage });
        return {
          function_name: functionName,
          success: false,
          error: errorMessage,
          duration_ms: Date.now() - fnStart,
        };
      }
    };

    // 1. Calculate Operations KPIs (from time_entries, tasks, etc.)
    if (domains.includes('operations') || full_recalc) {
      logStep('Calculating Operations KPIs...');
      const result = await callEdgeFunction('calculate-kpi-metrics', { 
        period: period === 'daily' ? 'weekly' : period 
      });
      results.push(result);
    }

    // 2. Calculate Sales KPIs (pipeline, conversions, etc.)
    if (domains.includes('sales') || full_recalc) {
      logStep('Calculating Sales KPIs...');
      const result = await callEdgeFunction('calculate-sales-kpis', { 
        period_type: period 
      });
      results.push(result);
    }

    // 3. Calculate Website KPIs (traffic, conversions, etc.)
    if (domains.includes('website') || full_recalc) {
      logStep('Calculating Website KPIs...');
      const result = await callEdgeFunction('calculate-web-kpis', {});
      results.push(result);
    }

    // 4. Sync Financial/Revenue Metrics
    if (domains.includes('financial') || full_recalc) {
      logStep('Syncing Financial Metrics...');
      const result = await callEdgeFunction('sync-revenue-metrics', {});
      results.push(result);
    }

    // 5. Calculate additional KPIs from calculate-kpis (CRM data)
    if (full_recalc) {
      logStep('Calculating CRM KPIs...');
      const result = await callEdgeFunction('calculate-kpis', {});
      results.push(result);
    }

    // Log execution summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalMetrics = results.reduce((sum, r) => sum + (r.metrics_count || 0), 0);

    // Record scheduler execution in kpi_calculation_log (if table exists)
    try {
      await supabase.from('kpi_calculation_log').insert({
        execution_type: full_recalc ? 'full_recalc' : 'scheduled',
        domains_calculated: domains,
        results: results,
        success_count: successCount,
        fail_count: failCount,
        total_metrics: totalMetrics,
        duration_ms: Date.now() - startTime,
      });
    } catch (logError) {
      // Table may not exist, that's okay
      logStep('Could not log to kpi_calculation_log', { error: logError });
    }

    // Update last calculation timestamp
    try {
      await supabase.from('system_settings').upsert({
        key: 'last_kpi_calculation',
        value: { 
          timestamp: new Date().toISOString(),
          success_count: successCount,
          fail_count: failCount,
          total_metrics: totalMetrics
        },
      }, { onConflict: 'key' });
    } catch (settingsError) {
      logStep('Could not update system_settings', { error: settingsError });
    }

    const summary = {
      success: failCount === 0,
      total_duration_ms: Date.now() - startTime,
      functions_called: results.length,
      success_count: successCount,
      fail_count: failCount,
      total_metrics_calculated: totalMetrics,
      results,
    };

    logStep('KPI calculation completed', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('ERROR in kpi-scheduler', { error: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        duration_ms: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
