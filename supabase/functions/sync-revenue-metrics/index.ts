import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

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
      return sum + (sub.subscription_plans?.price_euros || 0) * 100;
    }, 0);

    const arr = mrr * 12;
    const activeCount = activeSubscriptions.length;

    logStep("Calculated MRR and ARR", { mrr, arr, activeCount });

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

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

    // Calculate churn rate
    const previousActiveCount = yesterdayMetrics?.active_subscriptions || activeCount;
    const churnedCount = canceledSubs.length;
    const churnRate = previousActiveCount > 0 ? (churnedCount / previousActiveCount) * 100 : 0;

    // === NEW: Placement Fee Metrics ===
    const { data: placementFees, error: placementError } = await supabaseClient
      .from('placement_fees')
      .select('fee_amount, status, payment_due_date');

    if (placementError) {
      logStep('Warning: Could not fetch placement fees', placementError);
    }

    const fees = placementFees || [];
    const placementRevenue = fees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + (f.fee_amount || 0), 0);
    
    const pendingPlacementRevenue = fees
      .filter(f => f.status === 'pending' || f.status === 'invoiced')
      .reduce((sum, f) => sum + (f.fee_amount || 0), 0);

    // Outstanding AR (unpaid invoices)
    const { data: unpaidInvoices, error: invoiceError } = await supabaseClient
      .from('partner_invoices')
      .select('total_amount, due_date, status')
      .in('status', ['sent', 'viewed', 'overdue']);

    if (invoiceError) {
      logStep('Warning: Could not fetch invoices', invoiceError);
    }

    const invoices = unpaidInvoices || [];
    const outstandingAR = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const overdueAR = invoices
      .filter(inv => inv.status === 'overdue' || new Date(inv.due_date) < new Date())
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // Referral obligations (unpaid payouts)
    const { data: pendingPayouts, error: payoutError } = await supabaseClient
      .from('referral_payouts')
      .select('payout_amount, status')
      .in('status', ['pending', 'approved', 'processing']);

    if (payoutError) {
      logStep('Warning: Could not fetch referral payouts', payoutError);
    }

    const payouts = pendingPayouts || [];
    const referralObligations = payouts.reduce((sum, p) => sum + (p.payout_amount || 0), 0);

    // Calculate total revenue including placements
    const totalRevenue = mrr + placementRevenue;

    // Upsert today's metrics
    const metricsData = {
      metric_date: today,
      mrr,
      arr,
      new_mrr: newMrr,
      expansion_mrr: 0,
      contraction_mrr: 0,
      churn_mrr: churnMrr,
      active_subscriptions: activeCount,
      new_subscriptions: newSubs.length,
      canceled_subscriptions: canceledSubs.length,
      trialing_subscriptions: 0,
      average_revenue_per_user: arpu,
      customer_lifetime_value: arpu * 24,
      churn_rate: parseFloat(churnRate.toFixed(2)),
      net_revenue_retention: 100,
      total_revenue: totalRevenue,
    };

    const { error: upsertError } = await supabaseClient
      .from('revenue_metrics')
      .upsert(metricsData, { onConflict: 'metric_date' });

    if (upsertError) throw upsertError;

    // Extended metrics for response
    const extendedMetrics = {
      ...metricsData,
      placement_revenue: placementRevenue,
      pending_placement_revenue: pendingPlacementRevenue,
      outstanding_ar: outstandingAR,
      overdue_ar: overdueAR,
      referral_obligations: referralObligations,
      net_ar: outstandingAR - referralObligations,
    };

    logStep("Metrics synced successfully", extendedMetrics);

    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics: extendedMetrics 
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
