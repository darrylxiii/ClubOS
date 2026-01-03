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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting placement fees backfill...');

    // Get all hired applications without placement fees
    const { data: hiredApplications, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        candidate_id,
        user_id,
        updated_at,
        jobs:job_id (
          id,
          company_id,
          salary_max,
          companies:company_id (
            id,
            name,
            default_fee_percentage,
            default_fee_fixed
          )
        )
      `)
      .eq('status', 'hired');

    if (appError) {
      console.error('Error fetching applications:', appError);
      throw appError;
    }

    console.log(`Found ${hiredApplications?.length || 0} hired applications`);

    // Get existing placement fees to avoid duplicates
    const { data: existingFees } = await supabase
      .from('placement_fees')
      .select('application_id');

    const existingAppIds = new Set(existingFees?.map(f => f.application_id) || []);

    const newFees = [];
    const skipped = [];

    for (const app of hiredApplications || []) {
      if (existingAppIds.has(app.id)) {
        skipped.push(app.id);
        continue;
      }

      // Handle jobs as array (from join)
      const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
      if (!jobData) {
        console.log(`No job data for application ${app.id}`);
        continue;
      }

      const companyData = Array.isArray(jobData.companies) ? jobData.companies[0] : jobData.companies;
      
      // Calculate fee based on company defaults or fallback
      const baseSalary = jobData.salary_max || 75000;
      const feePercentage = companyData?.default_fee_percentage || 20;
      const fixedFee = companyData?.default_fee_fixed;
      
      const feeAmount = fixedFee || (baseSalary * (feePercentage / 100));

      newFees.push({
        application_id: app.id,
        job_id: app.job_id,
        candidate_id: app.candidate_id,
        user_id: app.user_id,
        company_id: jobData.company_id,
        fee_amount: feeAmount,
        fee_percentage: fixedFee ? null : feePercentage,
        currency: 'EUR',
        status: 'pending',
        notes: `Backfilled from hired application on ${new Date().toISOString().split('T')[0]}`,
        created_at: app.updated_at || new Date().toISOString(),
      });
    }

    console.log(`Creating ${newFees.length} new placement fees (skipped ${skipped.length} existing)`);

    if (newFees.length > 0) {
      const { error: insertError } = await supabase
        .from('placement_fees')
        .insert(newFees);

      if (insertError) {
        console.error('Error inserting placement fees:', insertError);
        throw insertError;
      }
    }

    // Also try to match placement fees with Moneybird invoices
    const { data: unmatchedFees } = await supabase
      .from('placement_fees')
      .select('id, company_id, created_at, fee_amount')
      .is('invoice_id', null)
      .not('company_id', 'is', null);

    let invoiceMatches = 0;
    for (const fee of unmatchedFees || []) {
      // Find invoices for this company around the placement date
      const { data: matchingInvoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('id, total_amount')
        .eq('company_id', fee.company_id)
        .order('invoice_date', { ascending: false })
        .limit(1);

      if (matchingInvoices && matchingInvoices.length > 0) {
        await supabase
          .from('placement_fees')
          .update({ invoice_id: matchingInvoices[0].id })
          .eq('id', fee.id);
        invoiceMatches++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          created: newFees.length,
          skipped: skipped.length,
          invoiceMatches,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
