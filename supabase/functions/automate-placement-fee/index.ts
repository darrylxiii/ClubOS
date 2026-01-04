import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlacementFeeRequest {
  application_id: string;
  candidate_salary?: number;
  fee_percentage?: number;
  auto_invoice?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { application_id, candidate_salary, fee_percentage, auto_invoice = true }: PlacementFeeRequest = await req.json();

    console.log(`[automate-placement-fee] Processing application: ${application_id}`);

    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(`
        id, job_id, candidate_id, status, candidate_full_name,
        jobs:job_id (
          id, title, company_id,
          companies:company_id (
            id, name, deal_value, default_fee_percentage
          )
        )
      `)
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      console.error("[automate-placement-fee] Application not found:", appError);
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if fee already exists
    const { data: existingFee } = await supabase
      .from("placement_fees")
      .select("id")
      .eq("application_id", application_id)
      .single();

    if (existingFee) {
      console.log("[automate-placement-fee] Fee already exists for this application");
      return new Response(
        JSON.stringify({ message: "Fee already exists", fee_id: existingFee.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fee
    const company = (application as any).jobs?.companies;
    const salary = candidate_salary || 80000; // Default salary if not provided
    const feePercentage = fee_percentage || company?.default_fee_percentage || 20;
    const feeAmount = salary * (feePercentage / 100);

    console.log(`[automate-placement-fee] Calculated fee: €${feeAmount} (${feePercentage}% of €${salary})`);

    // Create placement fee
    const { data: fee, error: feeError } = await supabase
      .from("placement_fees")
      .insert([{
        application_id,
        candidate_id: application.candidate_id,
        partner_company_id: company?.id,
        job_id: application.job_id,
        hired_date: new Date().toISOString(),
        candidate_salary: salary,
        fee_percentage: feePercentage,
        fee_amount: feeAmount,
        fee_percentage_used: feePercentage,
        status: "pending",
        payment_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cash_flow_status: "expected",
      }])
      .select()
      .single();

    if (feeError) {
      console.error("[automate-placement-fee] Error creating fee:", feeError);
      throw feeError;
    }

    console.log(`[automate-placement-fee] Created placement fee: ${fee.id}`);

    // Auto-create invoice in Moneybird if enabled
    if (auto_invoice && company) {
      try {
        const invoiceResponse = await fetch(`${supabaseUrl}/functions/v1/moneybird-create-invoice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            company_id: company.id,
            placement_fee_id: fee.id,
            amount: feeAmount,
            description: `Placement fee for ${application.candidate_full_name || 'candidate'} - ${(application as any).jobs?.title || 'position'}`,
          }),
        });

        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          console.log(`[automate-placement-fee] Created Moneybird invoice: ${invoiceData.invoice_id}`);

          // Update placement fee with invoice reference
          await supabase
            .from("placement_fees")
            .update({ 
              status: "invoiced",
              invoice_id: invoiceData.invoice_id,
            })
            .eq("id", fee.id);
        } else {
          console.warn("[automate-placement-fee] Failed to create Moneybird invoice:", await invoiceResponse.text());
        }
      } catch (invoiceError) {
        console.warn("[automate-placement-fee] Invoice creation failed (non-blocking):", invoiceError);
      }
    }

    // Capture investor metrics snapshot
    try {
      await supabase.rpc("capture_investor_metrics_snapshot", { p_snapshot_type: "daily" });
      console.log("[automate-placement-fee] Updated investor metrics snapshot");
    } catch (metricsError) {
      console.warn("[automate-placement-fee] Metrics snapshot failed (non-blocking):", metricsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fee_id: fee.id,
        fee_amount: feeAmount,
        fee_percentage: feePercentage,
        status: fee.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[automate-placement-fee] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
