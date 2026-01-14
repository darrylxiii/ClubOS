import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { application_id, actual_salary, payment_reference } = await req.json();

    console.log(`Processing referral payout for application: ${application_id}`);

    // Fetch all earnings for this application
    const { data: earnings, error: earningsError } = await supabase
      .from('referral_earnings')
      .select(`
        *,
        referral_policies (
          referrer_id,
          share_percentage
        )
      `)
      .eq('application_id', application_id)
      .in('status', ['projected', 'qualified']);

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
      throw earningsError;
    }

    if (!earnings || earnings.length === 0) {
      console.log('No earnings to process for this application');
      return new Response(
        JSON.stringify({ message: 'No earnings to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job for fee calculation
    const { data: application } = await supabase
      .from('applications')
      .select(`
        jobs (
          job_fee_percentage,
          job_fee_fixed,
          companies (
            fee_percentage
          )
        )
      `)
      .eq('id', application_id)
      .single();

    const job = application?.jobs as any;
    const company = job?.companies;

    // Calculate final placement fee based on actual salary
    let finalPlacementFee: number;
    if (job?.job_fee_fixed && job.job_fee_fixed > 0) {
      finalPlacementFee = job.job_fee_fixed;
    } else {
      const feePercentage = job?.job_fee_percentage || company?.fee_percentage || 20;
      finalPlacementFee = (actual_salary || 75000) * (feePercentage / 100);
    }

    const processedEarnings = [];

    for (const earning of earnings) {
      const sharePercentage = earning.referrer_share_percentage || 10;
      const finalEarnedAmount = finalPlacementFee * (sharePercentage / 100);

      const { data: updated, error: updateError } = await supabase
        .from('referral_earnings')
        .update({
          placement_fee_total: finalPlacementFee,
          earned_amount: finalEarnedAmount,
          projected_amount: finalEarnedAmount, // No longer projected
          status: 'pending_payment',
          qualified_at: new Date().toISOString(),
          payment_reference: payment_reference || null,
        })
        .eq('id', earning.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating earning:', updateError);
      } else {
        processedEarnings.push(updated);
      }
    }

    // Log the payout processing
    await supabase
      .from('activity_feed')
      .insert({
        event_type: 'referral_payout_processed',
        visibility: 'internal',
        event_data: {
          application_id,
          actual_salary,
          final_placement_fee: finalPlacementFee,
          earnings_processed: processedEarnings.length,
          total_payout: processedEarnings.reduce((sum, e) => sum + (e.earned_amount || 0), 0),
        }
      });

    console.log(`Processed ${processedEarnings.length} payouts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        payouts_processed: processedEarnings.length,
        total_payout: processedEarnings.reduce((sum, e) => sum + (e.earned_amount || 0), 0),
        results: processedEarnings 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing referral payout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
