import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplicationData {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  current_stage_index: number;
}

interface JobData {
  id: string;
  company_id: string;
  salary_min: number | null;
  salary_max: number | null;
  job_fee_percentage: number | null;
  job_fee_fixed: number | null;
  fee_source: string | null;
}

interface CompanyData {
  id: string;
  fee_percentage: number | null;
}

interface DealStage {
  name: string;
  probability: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { application_id, trigger_type } = await req.json();

    console.log(`Processing referral earnings for application: ${application_id}, trigger: ${trigger_type}`);

    // Fetch application with job and company data
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        candidate_id,
        status,
        current_stage_index,
        jobs!inner (
          id,
          company_id,
          salary_min,
          salary_max,
          job_fee_percentage,
          job_fee_fixed,
          fee_source,
          companies!inner (
            id,
            fee_percentage
          )
        )
      `)
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      console.error('Application not found:', appError);
      return new Response(
        JSON.stringify({ error: 'Application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = application.jobs as unknown as JobData & { companies: CompanyData };
    const company = job.companies;

    // Find matching referral policies (company-based or job-based)
    const { data: policies, error: policiesError } = await supabase
      .from('referral_policies')
      .select('*')
      .or(`company_id.eq.${job.company_id},job_id.eq.${job.id}`)
      .eq('is_active', true);

    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
      throw policiesError;
    }

    if (!policies || policies.length === 0) {
      console.log('No active referral policies found for this job/company');
      return new Response(
        JSON.stringify({ message: 'No active referral policies' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get deal stage for probability calculation
    const { data: dealStages } = await supabase
      .from('deal_stages')
      .select('name, probability')
      .order('display_order');

    // Map application stage to probability
    const stageNames = ['Applied', 'Screening', 'Interview', 'Final', 'Offer'];
    const currentStageName = stageNames[application.current_stage_index] || 'Applied';
    const matchingStage = dealStages?.find(s => 
      s.name.toLowerCase().includes(currentStageName.toLowerCase())
    );
    const stageProbability = matchingStage?.probability || 10;

    // Calculate placement fee
    const baseSalary = job.salary_max || job.salary_min || 75000; // Default fallback
    let placementFee: number;

    if (job.job_fee_fixed && job.job_fee_fixed > 0) {
      placementFee = job.job_fee_fixed;
    } else {
      const feePercentage = job.job_fee_percentage || company.fee_percentage || 20;
      placementFee = baseSalary * (feePercentage / 100);
    }

    // Process each matching policy
    const earningsResults = [];

    for (const policy of policies) {
      // Get referrer's revenue share configuration
      const { data: revenueShare } = await supabase
        .from('referral_revenue_shares')
        .select('*')
        .eq('user_id', policy.referrer_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Calculate referrer's share
      let sharePercentage = policy.share_percentage || 10; // Default 10%
      if (revenueShare) {
        if (revenueShare.share_type === 'fixed_percentage') {
          sharePercentage = revenueShare.share_percentage || sharePercentage;
        }
      }

      const earnedAmount = placementFee * (sharePercentage / 100);
      const projectedAmount = earnedAmount * (stageProbability / 100);

      // Determine status based on application status
      let earningsStatus = 'projected';
      if (application.status === 'hired') {
        earningsStatus = 'qualified';
      } else if (application.status === 'rejected' || application.status === 'withdrawn') {
        earningsStatus = 'cancelled';
      }

      // Upsert referral earnings record
      const { data: earning, error: earningError } = await supabase
        .from('referral_earnings')
        .upsert({
          referrer_id: policy.referrer_id,
          policy_id: policy.id,
          company_id: job.company_id,
          job_id: job.id,
          candidate_id: application.candidate_id,
          application_id: application.id,
          placement_fee_total: placementFee,
          referrer_share_percentage: sharePercentage,
          earned_amount: earnedAmount,
          projected_amount: projectedAmount,
          status: earningsStatus,
          qualified_at: earningsStatus === 'qualified' ? new Date().toISOString() : null,
        }, {
          onConflict: 'application_id,policy_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (earningError) {
        console.error('Error upserting earnings:', earningError);
        // Continue processing other policies
      } else {
        earningsResults.push(earning);
      }
    }

    console.log(`Processed ${earningsResults.length} earnings records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        earnings_updated: earningsResults.length,
        results: earningsResults 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating referral earnings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
