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
  circuit_state?: string;
}

interface CircuitBreakerState {
  function_name: string;
  state: 'closed' | 'open' | 'half_open';
  failure_count: number;
  next_retry_at: string | null;
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
  const traceId = crypto.randomUUID();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Helper to log execution events
  const logEvent = async (
    eventType: string,
    functionName: string,
    domain: string | null,
    severity: string,
    message: string,
    metadata: Record<string, unknown> = {},
    durationMs?: number,
    metricsCount?: number,
    errorMessage?: string
  ) => {
    try {
      await supabase.rpc('log_kpi_execution_event', {
        p_event_type: eventType,
        p_function_name: functionName,
        p_domain: domain,
        p_severity: severity,
        p_message: message,
        p_metadata: metadata,
        p_duration_ms: durationMs,
        p_metrics_count: metricsCount,
        p_error_message: errorMessage,
        p_trace_id: traceId,
      });
    } catch (e) {
      // Don't fail if logging fails
      console.error('[KPI-SCHEDULER] Failed to log event:', e);
    }
  };

  // Helper to check circuit breaker state
  const getCircuitState = async (functionName: string): Promise<CircuitBreakerState | null> => {
    try {
      const { data } = await supabase
        .from('circuit_breaker_state')
        .select('function_name, state, failure_count, next_retry_at')
        .eq('function_name', functionName)
        .single();
      return data;
    } catch {
      return null;
    }
  };

  // Helper to update circuit breaker
  const updateCircuitBreaker = async (functionName: string, success: boolean): Promise<string> => {
    try {
      const { data } = await supabase.rpc('update_circuit_breaker', {
        p_function_name: functionName,
        p_success: success,
      });
      return data || 'closed';
    } catch {
      return 'unknown';
    }
  };

  // Check if circuit allows execution
  const canExecute = async (functionName: string): Promise<{ allowed: boolean; state: string }> => {
    const circuitState = await getCircuitState(functionName);
    
    if (!circuitState) {
      return { allowed: true, state: 'closed' };
    }

    if (circuitState.state === 'open') {
      // Check if we should try half-open
      if (circuitState.next_retry_at && new Date(circuitState.next_retry_at) <= new Date()) {
        return { allowed: true, state: 'half_open' };
      }
      return { allowed: false, state: 'open' };
    }

    return { allowed: true, state: circuitState.state };
  };

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      full_recalc = false, 
      domains = ['operations', 'sales', 'website', 'financial'],
      period = 'daily'
    } = body;

    logStep('Starting KPI calculation orchestration', { full_recalc, domains, period, traceId });
    await logEvent('start', 'kpi-scheduler', null, 'info', 'Starting KPI calculation', { full_recalc, domains, period });

    const results: CalculationResult[] = [];

    // Helper to call edge functions with circuit breaker
    const callEdgeFunction = async (
      functionName: string, 
      domain: string,
      payload: Record<string, unknown> = {}
    ): Promise<CalculationResult> => {
      const fnStart = Date.now();
      
      // Check circuit breaker
      const { allowed, state } = await canExecute(functionName);
      
      if (!allowed) {
        logStep(`Circuit OPEN for ${functionName}, skipping`, { state });
        await logEvent('circuit_open', functionName, domain, 'warn', 
          `Skipped due to open circuit breaker`, { state });
        
        return {
          function_name: functionName,
          success: false,
          error: `Circuit breaker OPEN - will retry after cooldown`,
          duration_ms: 0,
          circuit_state: 'open',
        };
      }

      try {
        await logEvent('start', functionName, domain, 'debug', `Calling ${functionName}`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        const durationMs = Date.now() - fnStart;
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const metricsCount = data.metricsCount || data.kpis_calculated || data.metrics?.length || 0;
        
        // Update circuit breaker with success
        const newState = await updateCircuitBreaker(functionName, true);
        
        await logEvent('success', functionName, domain, 'info', 
          `Completed ${functionName} successfully`, 
          { metrics_count: metricsCount }, 
          durationMs, 
          metricsCount
        );

        return {
          function_name: functionName,
          success: true,
          metrics_count: metricsCount,
          duration_ms: durationMs,
          circuit_state: newState,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const durationMs = Date.now() - fnStart;
        
        logStep(`Error calling ${functionName}`, { error: errorMessage });
        
        // Update circuit breaker with failure
        const newState = await updateCircuitBreaker(functionName, false);
        
        await logEvent('failure', functionName, domain, 'error', 
          `Failed: ${errorMessage}`, 
          { circuit_state: newState }, 
          durationMs, 
          undefined, 
          errorMessage
        );
        
        // Log circuit state change if it opened
        if (newState === 'open') {
          await logEvent('circuit_open', functionName, domain, 'warn', 
            `Circuit breaker opened after repeated failures`);
        }

        return {
          function_name: functionName,
          success: false,
          error: errorMessage,
          duration_ms: durationMs,
          circuit_state: newState,
        };
      }
    };

    // 1. Calculate Operations KPIs (from time_entries, tasks, etc.)
    if (domains.includes('operations') || full_recalc) {
      logStep('Calculating Operations KPIs...');
      const result = await callEdgeFunction('calculate-kpi-metrics', 'operations', { 
        period: period === 'daily' ? 'weekly' : period 
      });
      results.push(result);
    }

    // 2. Calculate Sales KPIs (pipeline, conversions, etc.)
    if (domains.includes('sales') || full_recalc) {
      logStep('Calculating Sales KPIs...');
      const result = await callEdgeFunction('calculate-sales-kpis', 'sales', { 
        period_type: period 
      });
      results.push(result);
    }

    // 3. Calculate Website KPIs (traffic, conversions, etc.)
    if (domains.includes('website') || full_recalc) {
      logStep('Calculating Website KPIs...');
      const result = await callEdgeFunction('calculate-web-kpis', 'website', {});
      results.push(result);
    }

    // 4. Sync Financial/Revenue Metrics
    if (domains.includes('financial') || full_recalc) {
      logStep('Syncing Financial Metrics...');
      const result = await callEdgeFunction('sync-revenue-metrics', 'financial', {});
      results.push(result);
    }

    // 5. Calculate additional KPIs from calculate-kpis (CRM data)
    if (full_recalc) {
      logStep('Calculating CRM KPIs...');
      const result = await callEdgeFunction('calculate-kpis', 'operations', {});
      results.push(result);
    }

    // 6. Run KPI alerts check after calculations
    if (full_recalc) {
      logStep('Checking KPI alerts...');
      const alertResult = await callEdgeFunction('kpi-alerts', 'platform', { check_stale: true, notify: true });
      results.push(alertResult);
    }

    // Log execution summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalMetrics = results.reduce((sum, r) => sum + (r.metrics_count || 0), 0);
    const openCircuits = results.filter(r => r.circuit_state === 'open').length;

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

    // Update last calculation timestamp (use setting_key/setting_value columns)
    try {
      await supabase.from('system_settings').upsert({
        setting_key: 'last_kpi_calculation',
        setting_value: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          success_count: successCount,
          fail_count: failCount,
          total_metrics: totalMetrics,
          open_circuits: openCircuits,
          trace_id: traceId,
        }),
      }, { onConflict: 'setting_key' });
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
      open_circuits: openCircuits,
      trace_id: traceId,
      results,
    };

    logStep('KPI calculation completed', summary);
    await logEvent('success', 'kpi-scheduler', null, 'info', 
      `Completed: ${successCount}/${results.length} successful, ${totalMetrics} metrics`,
      { summary },
      Date.now() - startTime,
      totalMetrics
    );

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('ERROR in kpi-scheduler', { error: errorMessage });
    
    await logEvent('failure', 'kpi-scheduler', null, 'critical', 
      `Scheduler failed: ${errorMessage}`, 
      {}, 
      Date.now() - startTime, 
      undefined, 
      errorMessage
    );
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        duration_ms: Date.now() - startTime,
        trace_id: traceId,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
