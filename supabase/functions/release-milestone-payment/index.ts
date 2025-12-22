import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RELEASE-MILESTONE-PAYMENT] ${step}${detailsStr}`);
};

const PLATFORM_FEE_PERCENTAGE = 12; // 12% platform fee

interface PaymentInput {
  milestoneId: string;
  contractId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { milestoneId, contractId }: PaymentInput = await req.json();
    if (!milestoneId || !contractId) {
      throw new Error("milestoneId and contractId are required");
    }
    logStep("Request data", { milestoneId, contractId });

    // Fetch milestone
    const { data: milestone, error: milestoneError } = await supabaseClient
      .from("project_milestones")
      .select("*")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      throw new Error(`Milestone not found: ${milestoneError?.message}`);
    }

    // Verify milestone is approved
    if (milestone.status !== "approved") {
      throw new Error("Milestone must be approved before payment release");
    }
    logStep("Milestone verified", { status: milestone.status, amount: milestone.amount });

    // Fetch contract from project_contracts
    const { data: contract, error: contractError } = await supabaseClient
      .from("project_contracts")
      .select(`
        *,
        freelance_profile:freelance_profiles(
          stripe_connect_account_id,
          stripe_connect_onboarded
        )
      `)
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      throw new Error(`Contract not found: ${contractError?.message}`);
    }

    // Verify user is the client (only client can release payment)
    if (contract.client_id !== user.id) {
      throw new Error("Only the client can release milestone payments");
    }
    logStep("Contract verified", { contractId: contract.id });

    // Verify freelancer has Stripe Connect set up
    const freelanceProfile = (contract as any).freelance_profile;
    if (!freelanceProfile?.stripe_connect_account_id) {
      throw new Error("Freelancer has not set up their payment account");
    }
    if (!freelanceProfile.stripe_connect_onboarded) {
      throw new Error("Freelancer has not completed payment onboarding");
    }
    logStep("Freelancer payment account verified", {
      accountId: freelanceProfile.stripe_connect_account_id
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Calculate amounts
    const amountInCents = Math.round((milestone.amount || 0) * 100);
    const platformFee = Math.round(amountInCents * (PLATFORM_FEE_PERCENTAGE / 100));
    const freelancerAmount = amountInCents - platformFee;

    logStep("Payment calculation", {
      total: amountInCents,
      platformFee,
      freelancerAmount
    });

    // Create transfer to freelancer's connected account
    const transfer = await stripe.transfers.create({
      amount: freelancerAmount,
      currency: "eur",
      destination: freelanceProfile.stripe_connect_account_id,
      metadata: {
        contract_id: contractId,
        milestone_id: milestoneId,
        client_id: user.id,
        freelancer_id: contract.freelancer_id,
        platform_fee: platformFee.toString(),
        type: "milestone_payment",
      },
      description: `Milestone payment: ${milestone.title}`,
    });

    logStep("Transfer created", { transferId: transfer.id, amount: freelancerAmount });

    // Update milestone with payment info
    const { error: updateError } = await supabaseClient
      .from("project_milestones")
      .update({
        paid_at: new Date().toISOString(),
        status: "paid",
        payment_reference: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestoneId);

    if (updateError) {
      logStep("Warning: Could not update milestone", { error: updateError.message });
    }

    // Record the transaction
    await supabaseClient
      .from("payment_transactions")
      .insert({
        invoice_id: null,
        transaction_date: new Date().toISOString(),
        amount: milestone.amount,
        currency_code: "EUR",
        payment_method: "stripe",
        payment_reference: transfer.id,
        status: "completed",
        notes: `Milestone payment for: ${milestone.title}. Platform fee: €${(platformFee / 100).toFixed(2)}`,
      });

    logStep("Payment transaction recorded");

    // Update contract escrow balance
    const newEscrowBalance = (contract.escrow_amount || 0) - milestone.amount;
    await supabaseClient
      .from("project_contracts")
      .update({
        escrow_amount: Math.max(0, newEscrowBalance),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId);

    logStep("Escrow balance updated", { newBalance: newEscrowBalance });


    return new Response(JSON.stringify({
      success: true,
      message: "Payment released successfully",
      transferId: transfer.id,
      milestoneId,
      amount: milestone.amount,
      freelancerReceived: freelancerAmount / 100,
      platformFee: platformFee / 100,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


