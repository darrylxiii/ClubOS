import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommissionTier {
  min_revenue: number;
  max_revenue: number | null;
  commission_rate: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      employee_id,
      recalculate = false 
    } = body;

    console.log(`[Calculate Commissions] Year: ${year}, Month: ${month}, Employee: ${employee_id || 'all'}`);

    // Get all paid placement fees that don't have commissions calculated yet
    let query = supabase
      .from('placement_fees')
      .select(`
        id, application_id, job_id, candidate_id, partner_company_id,
        fee_amount, fee_currency, status, created_by, paid_at,
        applications!inner (
          id, user_id, sourced_by
        )
      `)
      .eq('status', 'paid')
      .gte('paid_at', `${year}-01-01`)
      .lte('paid_at', `${year}-12-31`);

    if (employee_id) {
      query = query.eq('created_by', employee_id);
    }

    const { data: paidFees, error: feesError } = await query;

    if (feesError) throw feesError;

    console.log(`[Calculate Commissions] Found ${paidFees?.length || 0} paid placement fees`);

    // Get existing commissions to avoid duplicates
    const { data: existingCommissions } = await supabase
      .from('employee_commissions')
      .select('placement_fee_id')
      .eq('year', year);

    const existingFeeIds = new Set(existingCommissions?.map(c => c.placement_fee_id) || []);

    // Get employee commission tiers
    const { data: employees } = await supabase
      .from('employee_profiles')
      .select('id, user_id, commission_tier_id, annual_target');

    const employeeMap = new Map(employees?.map(e => [e.user_id, e]) || []);

    // Get commission tiers
    const { data: tiers } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('is_active', true)
      .order('min_revenue', { ascending: true });

    const tierMap = new Map(tiers?.map(t => [t.id, t]) || []);

    // Default commission rates if no tier configured
    const defaultCommissionRate = 0.10; // 10%

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      commissions: [] as any[],
    };

    for (const fee of paidFees || []) {
      // Skip if already processed (unless recalculating)
      if (!recalculate && existingFeeIds.has(fee.id)) {
        results.skipped++;
        continue;
      }

      // Handle applications as array from join
      const application = Array.isArray(fee.applications) ? fee.applications[0] : fee.applications;
      const recruiterId = fee.created_by || application?.sourced_by || application?.user_id;
      
      if (!recruiterId) {
        results.errors.push(`Fee ${fee.id}: No recruiter found`);
        continue;
      }

      const employee = employeeMap.get(recruiterId);
      let commissionRate = defaultCommissionRate;

      // Get commission rate from tier if available
      if (employee?.commission_tier_id && tierMap.has(employee.commission_tier_id)) {
        const tier = tierMap.get(employee.commission_tier_id);
        commissionRate = tier.base_rate / 100;
      }

      const commissionAmount = fee.fee_amount * commissionRate;
      const paidDate = new Date(fee.paid_at);

      try {
        // If recalculating, delete existing commission first
        if (recalculate && existingFeeIds.has(fee.id)) {
          await supabase
            .from('employee_commissions')
            .delete()
            .eq('placement_fee_id', fee.id);
        }

        // Create commission record
        const { data: commission, error: insertError } = await supabase
          .from('employee_commissions')
          .insert({
            employee_id: employee?.id || recruiterId,
            placement_fee_id: fee.id,
            commission_amount: commissionAmount,
            commission_rate: commissionRate * 100,
            year: paidDate.getFullYear(),
            month: paidDate.getMonth() + 1,
            status: 'pending',
            calculation_notes: `Auto-calculated: ${(commissionRate * 100).toFixed(1)}% of €${fee.fee_amount.toFixed(2)}`,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        results.created++;
        results.commissions.push({
          fee_id: fee.id,
          recruiter_id: recruiterId,
          fee_amount: fee.fee_amount,
          commission_amount: commissionAmount,
          rate: commissionRate,
        });

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Fee ${fee.id}: ${message}`);
      }

      results.processed++;
    }

    // Also create referral payouts for any referrals linked to hired candidates
    const { data: hiredApplications } = await supabase
      .from('applications')
      .select(`
        id, candidate_id, job_id,
        candidate_profiles!inner (
          id, referred_by
        )
      `)
      .eq('status', 'hired')
      .not('candidate_profiles.referred_by', 'is', null);

    let referralPayoutsCreated = 0;

    for (const app of hiredApplications || []) {
      // Handle candidate_profiles as array from join
      const candidateProfile = Array.isArray(app.candidate_profiles) ? app.candidate_profiles[0] : app.candidate_profiles;
      const referrerId = candidateProfile?.referred_by;
      if (!referrerId) continue;

      // Check if payout already exists
      const { data: existingPayout } = await supabase
        .from('referral_payouts')
        .select('id')
        .eq('referrer_id', referrerId)
        .eq('application_id', app.id)
        .maybeSingle();

      if (existingPayout) continue;

      // Get referral config
      const { data: config } = await supabase
        .from('referral_config')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const payoutAmount = config?.base_reward_amount || 500;

      // Create referral payout
      const { error: payoutError } = await supabase
        .from('referral_payouts')
        .insert({
          referrer_id: referrerId,
          application_id: app.id,
          candidate_id: app.candidate_id,
          payout_amount: payoutAmount,
          payout_currency: 'EUR',
          status: 'pending',
          notes: 'Auto-created on hire',
        });

      if (!payoutError) {
        referralPayoutsCreated++;
      }
    }

    console.log(`[Calculate Commissions] Results:`, {
      ...results,
      referral_payouts_created: referralPayoutsCreated,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats: {
          processed: results.processed,
          commissions_created: results.created,
          skipped: results.skipped,
          errors: results.errors.length,
          referral_payouts_created: referralPayoutsCreated,
        },
        commissions: results.commissions,
        errors: results.errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Calculate Commissions] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
