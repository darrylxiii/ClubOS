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
    // Parse request body for dryRun flag
    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = body?.dryRun === true;
    } catch {
      // No body or invalid JSON - proceed with default (not dry run)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting placement fees backfill... (dryRun: ${dryRun})`);

    // Get all hired applications without placement fees
    const { data: hiredApplications, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        candidate_id,
        user_id,
        sourced_by,
        candidate_full_name,
        updated_at,
        jobs:job_id (
          id,
          title,
          company_id,
          salary_min,
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
    const errors = [];

    for (const app of hiredApplications || []) {
      if (existingAppIds.has(app.id)) {
        skipped.push(app.id);
        continue;
      }

      // Handle jobs as array (from join)
      const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
      if (!jobData) {
        errors.push({ id: app.id, error: 'No job data found' });
        continue;
      }

      const companyData = Array.isArray(jobData.companies) ? jobData.companies[0] : jobData.companies;
      
      // Calculate fee based on company defaults or fallback
      const baseSalary = jobData.salary_max || jobData.salary_min || 75000;
      const feePercentage = companyData?.default_fee_percentage || 20;
      const fixedFee = companyData?.default_fee_fixed;
      
      const feeAmount = fixedFee || (baseSalary * (feePercentage / 100));

      // Use correct column names matching the schema
      newFees.push({
        application_id: app.id,
        job_id: app.job_id,
        candidate_id: app.candidate_id,
        partner_company_id: jobData.company_id,
        fee_amount: feeAmount,
        fee_percentage: fixedFee ? null : feePercentage,
        candidate_salary: baseSalary,
        currency_code: 'EUR',
        status: 'pending',
        hired_date: app.updated_at || new Date().toISOString(),
        created_by: app.sourced_by || app.user_id,
        notes: `Backfilled from hired application on ${new Date().toISOString().split('T')[0]}`,
      });
    }

    console.log(`${dryRun ? '[DRY RUN] Would create' : 'Creating'} ${newFees.length} new placement fees (skipped ${skipped.length} existing, ${errors.length} errors)`);

    let insertedCount = 0;
    const insertErrors = [];

    // Skip inserts if dry run
    if (!dryRun) {
      // Insert in batches to handle potential errors better
      for (const fee of newFees) {
        const { error: insertError } = await supabase
          .from('placement_fees')
          .insert(fee);

        if (insertError) {
          console.error(`Error inserting fee for app ${fee.application_id}:`, insertError);
          insertErrors.push({ application_id: fee.application_id, error: insertError.message });
        } else {
          insertedCount++;
        }
      }
    } else {
      insertedCount = newFees.length; // In dry run, report what would be created
    }

    // Try to match placement fees with Moneybird invoices (skip in dry run)
    let invoiceMatches = 0;
    
    if (!dryRun) {
      const { data: unmatchedFees } = await supabase
        .from('placement_fees')
        .select('id, partner_company_id, hired_date, fee_amount')
        .is('invoice_id', null)
        .not('partner_company_id', 'is', null);

      for (const fee of unmatchedFees || []) {
        // Find invoices for this company around the placement date
        const { data: matchingInvoices } = await supabase
          .from('moneybird_sales_invoices')
          .select('id, moneybird_id, total_amount, invoice_date')
          .eq('company_id', fee.partner_company_id)
          .order('invoice_date', { ascending: false })
          .limit(5);

        // Try to find a close match by amount
        const matchingInvoice = matchingInvoices?.find(inv => {
          const amountDiff = Math.abs(inv.total_amount - fee.fee_amount);
          const percentDiff = amountDiff / fee.fee_amount;
          return percentDiff < 0.05; // Within 5% of expected fee
        });

        if (matchingInvoice) {
          const { error: updateError } = await supabase
            .from('placement_fees')
            .update({ 
              invoice_id: matchingInvoice.id,
              notes: `Matched to invoice ${matchingInvoice.moneybird_id} (amount match)`
            })
            .eq('id', fee.id);
          
          if (!updateError) {
            invoiceMatches++;
          }
        }
      }
    }

    // Trigger commission calculation for newly created fees if they have paid status
    const { data: paidFees } = await supabase
      .from('placement_fees')
      .select('id')
      .eq('status', 'paid');

    console.log(`Found ${paidFees?.length || 0} paid fees that may need commission calculation`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        data: {
          found: hiredApplications?.length || 0,
          created: insertedCount,
          skipped: skipped.length,
          errors: errors.length + insertErrors.length,
          invoiceMatches,
          wouldCreate: dryRun ? newFees : undefined,
          errorDetails: [...errors, ...insertErrors].slice(0, 10), // Return first 10 errors
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
