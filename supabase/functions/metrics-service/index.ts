/**
 * Metrics Service - Unified metrics and analytics calculation
 * Consolidates KPI, revenue, funnel, and performance metrics
 * 
 * Usage: POST with { action: "calculate-kpis", payload: {...} }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

// Action handlers
import { calculateKpisAction } from "./actions/calculate-kpis.ts";
import { calculateRevenueAction } from "./actions/calculate-revenue.ts";
import { calculateFunnelAction } from "./actions/calculate-funnel.ts";
import { calculateMatchScoreAction } from "./actions/calculate-match-score.ts";

export interface MetricsContext {
  supabase: ReturnType<typeof createClient>;
  payload: Record<string, unknown>;
  userId?: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  cached?: boolean;
}

type ActionHandler = (ctx: MetricsContext) => Promise<ActionResult>;

// Action router
const actions: Record<string, ActionHandler> = {
  // KPI calculations
  "calculate-kpis": calculateKpisAction,
  "calculate-all-kpis": calculateKpisAction,
  "calculate-web-kpis": calculateKpisAction,
  "calculate-sales-kpis": calculateKpisAction,
  
  // Revenue & financial metrics
  "calculate-revenue": calculateRevenueAction,
  "calculate-revenue-milestones": calculateRevenueAction,
  "calculate-payment-metrics": calculateRevenueAction,
  "calculate-recruiter-commissions": calculateRevenueAction,
  "calculate-referral-earnings": calculateRevenueAction,
  
  // Funnel & conversion metrics
  "calculate-funnel": calculateFunnelAction,
  "calculate-funnel-metrics": calculateFunnelAction,
  "calculate-lead-conversion": calculateFunnelAction,
  "calculate-target-progress": calculateFunnelAction,
  
  // Match & scoring
  "calculate-match-score": calculateMatchScoreAction,
  "calculate-enhanced-match": calculateMatchScoreAction,
  "calculate-move-probability": calculateMatchScoreAction,
  "calculate-hiring-intent": calculateMatchScoreAction,
  "calculate-stakeholder-influence": calculateMatchScoreAction,
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { action, payload } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing action parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get handler
    const handler = actions[action];
    if (!handler) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unknown action: ${action}`,
          available_actions: Object.keys(actions)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header if present
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      userId = user?.id;
    }

    // Check cache first (for expensive calculations)
    const cacheKey = `metrics:${action}:${JSON.stringify(payload)}`;
    const cached = await checkCache(supabase, cacheKey);
    if (cached) {
      console.log(`[metrics-service] Cache hit for: ${action}`);
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute action
    const startTime = Date.now();
    console.log(`[metrics-service] Executing action: ${action}`);
    const result = await handler({ supabase, payload, userId });
    const duration = Date.now() - startTime;

    // Cache successful results
    if (result.success && duration > 100) {
      await setCache(supabase, cacheKey, result, 300); // 5 min cache
    }

    // Log execution
    await supabase.from("kpi_execution_events").insert({
      kpi_name: action,
      execution_time_ms: duration,
      success: result.success,
      error_message: result.error,
      payload_hash: hashPayload(payload),
    }).catch(() => { /* Ignore logging errors */ });

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[metrics-service] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkCache(
  supabase: ReturnType<typeof createClient>, 
  key: string
): Promise<ActionResult | null> {
  try {
    const { data } = await supabase
      .from("metrics_cache")
      .select("result, expires_at")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .single();
    
    return data?.result as ActionResult | null;
  } catch {
    return null;
  }
}

async function setCache(
  supabase: ReturnType<typeof createClient>,
  key: string,
  result: ActionResult,
  ttlSeconds: number
): Promise<void> {
  try {
    await supabase.from("metrics_cache").upsert({
      cache_key: key,
      result,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  } catch {
    // Ignore cache errors
  }
}

function hashPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload).slice(0, 100);
}
