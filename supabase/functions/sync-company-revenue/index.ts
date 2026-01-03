import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Phase 3: Revenue Intelligence on Companies
 * 
 * This function aggregates revenue metrics from moneybird_sales_invoices
 * and updates the companies table with:
 * - total_revenue, total_paid, total_outstanding
 * - revenue_tier (Platinum/Gold/Silver/Bronze/New)
 * - payment_reliability_score (based on on-time payment history)
 * - last_payment_date, invoice_count
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[Sync Company Revenue] Starting aggregation...');

    // Get all invoices grouped by company_id
    const { data: invoices, error: invoicesError } = await supabase
      .from('moneybird_sales_invoices')
      .select('company_id, total_amount, paid_amount, unpaid_amount, state_normalized, paid_at, due_date')
      .not('company_id', 'is', null);

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      console.log('[Sync Company Revenue] No invoices with company_id found');
      return new Response(
        JSON.stringify({ success: true, message: 'No invoices to process', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate by company
    const companyMetrics: Record<string, {
      total_revenue: number;
      total_paid: number;
      total_outstanding: number;
      invoice_count: number;
      paid_invoice_count: number;
      on_time_payments: number;
      late_payments: number;
      last_payment_date: string | null;
    }> = {};

    for (const inv of invoices) {
      const companyId = inv.company_id;
      if (!companyId) continue;

      if (!companyMetrics[companyId]) {
        companyMetrics[companyId] = {
          total_revenue: 0,
          total_paid: 0,
          total_outstanding: 0,
          invoice_count: 0,
          paid_invoice_count: 0,
          on_time_payments: 0,
          late_payments: 0,
          last_payment_date: null,
        };
      }

      const metrics = companyMetrics[companyId];
      
      // Skip drafts from revenue
      if (inv.state_normalized !== 'draft' && inv.state_normalized !== 'cancelled') {
        metrics.total_revenue += Number(inv.total_amount) || 0;
        metrics.total_paid += Number(inv.paid_amount) || 0;
        metrics.total_outstanding += Number(inv.unpaid_amount) || 0;
        metrics.invoice_count++;

        // Track payment timing for reliability score
        if (inv.state_normalized === 'paid' && inv.paid_at) {
          metrics.paid_invoice_count++;
          
          // Update last payment date
          if (!metrics.last_payment_date || inv.paid_at > metrics.last_payment_date) {
            metrics.last_payment_date = inv.paid_at;
          }

          // Check if paid on time (before or on due date)
          if (inv.due_date) {
            const paidDate = new Date(inv.paid_at);
            const dueDate = new Date(inv.due_date);
            if (paidDate <= dueDate) {
              metrics.on_time_payments++;
            } else {
              metrics.late_payments++;
            }
          } else {
            // No due date, assume on-time
            metrics.on_time_payments++;
          }
        }
      }
    }

    console.log(`[Sync Company Revenue] Aggregated ${Object.keys(companyMetrics).length} companies`);

    // Update each company
    let updatedCount = 0;
    const errors: string[] = [];

    for (const [companyId, metrics] of Object.entries(companyMetrics)) {
      // Calculate revenue tier
      let revenueTier = 'new';
      if (metrics.total_revenue >= 100000) {
        revenueTier = 'platinum';
      } else if (metrics.total_revenue >= 50000) {
        revenueTier = 'gold';
      } else if (metrics.total_revenue >= 20000) {
        revenueTier = 'silver';
      } else if (metrics.total_revenue >= 5000) {
        revenueTier = 'bronze';
      }

      // Calculate payment reliability score (0-100)
      let reliabilityScore = 0;
      if (metrics.paid_invoice_count > 0) {
        reliabilityScore = Math.round(
          (metrics.on_time_payments / metrics.paid_invoice_count) * 100
        );
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          total_revenue: metrics.total_revenue,
          total_paid: metrics.total_paid,
          total_outstanding: metrics.total_outstanding,
          revenue_tier: revenueTier,
          payment_reliability_score: reliabilityScore,
          last_payment_date: metrics.last_payment_date,
          invoice_count: metrics.invoice_count,
        })
        .eq('id', companyId);

      if (updateError) {
        errors.push(`Company ${companyId}: ${updateError.message}`);
      } else {
        updatedCount++;
      }
    }

    // Log the sync
    await supabase.from('financial_events').insert({
      event_type: 'company_revenue.synced',
      entity_type: 'batch',
      metadata: {
        companies_updated: updatedCount,
        total_companies: Object.keys(companyMetrics).length,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: Date.now() - startTime,
      },
    });

    console.log(`[Sync Company Revenue] Updated ${updatedCount} companies in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        total: Object.keys(companyMetrics).length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Sync Company Revenue] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
