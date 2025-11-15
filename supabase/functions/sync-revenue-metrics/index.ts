import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-REVENUE-METRICS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting revenue metrics sync");

    // Calculate current MRR from active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseClient
      .from('subscriptions')
      .select(`
        id,
        status,
        current_period_end,
        subscription_plans(price_euros)
      `)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString());

    if (subsError) throw subsError;

    const mrr = activeSubscriptions.reduce((sum, sub: any) => {
      return sum + (sub.subscription_plans?.price_euros || 0) * 100; // Convert to cents
    }, 0);

    const arr = mrr * 12;
    const activeCount = activeSubscriptions.length;

    logStep("Calculated MRR and ARR", { mrr, arr, activeCount });

    // Get today's metrics if they exist
    const today = new Date().toISOString().split('T')[0];
    const { data: existingMetrics } = await supabaseClient
      .from('revenue_metrics')
      .select('*')
      .eq('metric_date', today)
      .single();

    // Get yesterday's metrics for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    const { data: yesterdayMetrics } = await supabaseClient
      .from('revenue_metrics')
      .select('*')
      .eq('metric_date', yesterdayDate)
      .single();

    // Calculate new MRR (subscriptions created today)
    const { data: newSubs, error: newSubsError } = await supabaseClient
      .from('subscriptions')
      .select(`
        id,
        subscription_plans(price_euros)
      `)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    if (newSubsError) throw newSubsError;

    const newMrr = newSubs.reduce((sum, sub: any) => {
      return sum + (sub.subscription_plans?.price_euros || 0) * 100;
    }, 0);

    // Calculate churn MRR (subscriptions canceled today)
    const { data: canceledSubs, error: canceledError } = await supabaseClient
      .from('subscriptions')
      .select(`
        id,
        subscription_plans(price_euros)
      `)
      .eq('status', 'canceled')
      .gte('canceled_at', `${today}T00:00:00`)
      .lte('canceled_at', `${today}T23:59:59`);

    if (canceledError) throw canceledError;

    const churnMrr = canceledSubs.reduce((sum, sub: any) => {
      return sum + (sub.subscription_plans?.price_euros || 0) * 100;
    }, 0);

    // Calculate ARPU
    const arpu = activeCount > 0 ? Math.round(mrr / activeCount) : 0;

    // Calculate churn rate (simplified - should be calculated monthly)
    const previousActiveCount = yesterdayMetrics?.active_subscriptions || activeCount;
    const churnedCount = canceledSubs.length;
    const churnRate = previousActiveCount > 0 ? (churnedCount / previousActiveCount) * 100 : 0;

    // Upsert today's metrics
    const metricsData = {
      metric_date: today,
      mrr,
      arr,
      new_mrr: newMrr,
      expansion_mrr: 0, // TODO: Calculate from plan upgrades
      contraction_mrr: 0, // TODO: Calculate from plan downgrades
      churn_mrr: churnMrr,
      active_subscriptions: activeCount,
      new_subscriptions: newSubs.length,
      canceled_subscriptions: canceledSubs.length,
      trialing_subscriptions: 0, // TODO: Add trialing count
      average_revenue_per_user: arpu,
      customer_lifetime_value: arpu * 24, // Simplified: 24 month estimate
      churn_rate: parseFloat(churnRate.toFixed(2)),
      net_revenue_retention: 100, // TODO: Calculate actual NRR
      total_revenue: mrr, // TODO: Add invoices total
    };

    const { error: upsertError } = await supabaseClient
      .from('revenue_metrics')
      .upsert(metricsData, { onConflict: 'metric_date' });

    if (upsertError) throw upsertError;

    logStep("Metrics synced successfully", metricsData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics: metricsData 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-revenue-metrics", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
