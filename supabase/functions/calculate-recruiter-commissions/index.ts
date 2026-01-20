import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        fee_amount, currency_code, status, created_by, paid_at,
        candidate_salary, fee_percentage,
        applications!inner (
          id, user_id, sourced_by,
          candidate_full_name
        ),
        jobs (
          title
        ),
        companies:partner_company_id (
          name
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
      .select('placement_fee_id, employee_id, commission_type');

    const existingCommissionKeys = new Set(
      existingCommissions?.map(c => `${c.placement_fee_id}-${c.employee_id}-${c.commission_type}`) || []
    );

    // Get employee profiles with commission tiers
    const { data: employees } = await supabase
      .from('employee_profiles')
      .select('id, user_id, commission_tier_id, commission_percentage, annual_target');

    const employeeMap = new Map(employees?.map(e => [e.user_id, e]) || []);

    // Get commission tiers
    const { data: tiers } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('is_active', true)
      .order('min_revenue', { ascending: true });

    const tierMap = new Map(tiers?.map(t => [t.id, t]) || []);

    // Default commission rate if no tier configured
    const defaultCommissionRate = 10; // 10%

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      commissions: [] as any[],
    };

    for (const fee of paidFees || []) {
      // Handle applications as array from join
      const application = Array.isArray(fee.applications) ? fee.applications[0] : fee.applications;
      const job = Array.isArray(fee.jobs) ? fee.jobs[0] : fee.jobs;
      const company = Array.isArray(fee.companies) ? fee.companies[0] : fee.companies;
      
      const recruiterId = fee.created_by || application?.sourced_by || application?.user_id;
      
      if (!recruiterId) {
        results.errors.push(`Fee ${fee.id}: No recruiter found`);
        continue;
      }

      const employee = employeeMap.get(recruiterId);
      
      if (!employee) {
        results.errors.push(`Fee ${fee.id}: No employee profile found for recruiter ${recruiterId}`);
        continue;
      }

      // Get commission rate from tier or employee profile
      let commissionRate = defaultCommissionRate;
      if (employee.commission_tier_id && tierMap.has(employee.commission_tier_id)) {
        const tier = tierMap.get(employee.commission_tier_id);
        commissionRate = tier.percentage || tier.base_rate || defaultCommissionRate;
      } else if (employee.commission_percentage) {
        commissionRate = employee.commission_percentage;
      }

      const commissionAmount = fee.fee_amount * (commissionRate / 100);
      const paidDate = new Date(fee.paid_at);
      const commissionKey = `${fee.id}-${employee.id}-placement`;

      // Skip if already exists (unless recalculating)
      if (!recalculate && existingCommissionKeys.has(commissionKey)) {
        results.skipped++;
        continue;
      }

      try {
        // If recalculating, delete existing commission first
        if (recalculate) {
          await supabase
            .from('employee_commissions')
            .delete()
            .eq('placement_fee_id', fee.id)
            .eq('employee_id', employee.id)
            .eq('commission_type', 'placement');
        }

        // Create commission record with correct column names
        const { data: commission, error: insertError } = await supabase
          .from('employee_commissions')
          .insert({
            employee_id: employee.id,
            source_type: 'placement_fee',
            source_id: fee.id,
            placement_fee_id: fee.id,
            gross_amount: commissionAmount,
            commission_rate: commissionRate,
            placement_fee_base: fee.fee_amount,
            candidate_name: application?.candidate_full_name || 'Unknown',
            company_name: company?.name || 'Unknown',
            job_title: job?.title || 'Unknown',
            commission_type: 'placement',
            split_percentage: 100,
            status: 'pending',
            period_date: paidDate.toISOString().split('T')[0],
          })
          .select()
          .single();

        if (insertError) throw insertError;

        results.created++;
        results.commissions.push({
          fee_id: fee.id,
          employee_id: employee.id,
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

    // Also check for strategist splits on companies with assignments
    const { data: strategistAssignments } = await supabase
      .from('company_strategist_assignments')
      .select(`
        company_id, strategist_id, is_active,
        employee_profiles!inner (
          id, commission_tier_id, commission_percentage
        )
      `)
      .eq('is_active', true);

    const assignmentMap = new Map(
      strategistAssignments?.map(a => [a.company_id, a]) || []
    );

    let strategistSplitsCreated = 0;

    for (const fee of paidFees || []) {
      const assignment = assignmentMap.get(fee.partner_company_id);
      if (!assignment) continue;

      const application = Array.isArray(fee.applications) ? fee.applications[0] : fee.applications;
      const job = Array.isArray(fee.jobs) ? fee.jobs[0] : fee.jobs;
      const company = Array.isArray(fee.companies) ? fee.companies[0] : fee.companies;

      // Skip if strategist is the same as recruiter
      const recruiterId = fee.created_by || application?.sourced_by || application?.user_id;
      if (assignment.strategist_id === recruiterId) continue;

      const strategistEmployee = Array.isArray(assignment.employee_profiles) 
        ? assignment.employee_profiles[0] 
        : assignment.employee_profiles;

      if (!strategistEmployee) continue;

      const commissionKey = `${fee.id}-${strategistEmployee.id}-strategist_split`;
      if (existingCommissionKeys.has(commissionKey)) continue;

      // Strategist gets 20% of their normal rate
      let baseRate = defaultCommissionRate;
      if (strategistEmployee.commission_tier_id && tierMap.has(strategistEmployee.commission_tier_id)) {
        const tier = tierMap.get(strategistEmployee.commission_tier_id);
        baseRate = tier.percentage || tier.base_rate || defaultCommissionRate;
      } else if (strategistEmployee.commission_percentage) {
        baseRate = strategistEmployee.commission_percentage;
      }

      const strategistRate = baseRate * 0.2; // 20% split
      const strategistAmount = fee.fee_amount * (strategistRate / 100);

      const { error: splitError } = await supabase
        .from('employee_commissions')
        .insert({
          employee_id: strategistEmployee.id,
          source_type: 'placement_fee',
          source_id: fee.id,
          placement_fee_id: fee.id,
          gross_amount: strategistAmount,
          commission_rate: strategistRate,
          placement_fee_base: fee.fee_amount,
          candidate_name: application?.candidate_full_name || 'Unknown',
          company_name: company?.name || 'Unknown',
          job_title: job?.title || 'Unknown',
          commission_type: 'strategist_split',
          split_percentage: 20,
          status: 'pending',
          period_date: new Date(fee.paid_at).toISOString().split('T')[0],
        });

      if (!splitError) {
        strategistSplitsCreated++;
      }
    }

    console.log(`[Calculate Commissions] Results:`, {
      ...results,
      strategist_splits_created: strategistSplitsCreated,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats: {
          processed: results.processed,
          commissions_created: results.created,
          skipped: results.skipped,
          errors: results.errors.length,
          strategist_splits_created: strategistSplitsCreated,
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
