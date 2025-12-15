import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PROJECT-ESCROW] ${step}${detailsStr}`);
};

const PLATFORM_FEE_PERCENTAGE = 12; // 12% platform fee

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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { contractId, amount } = await req.json();
    if (!contractId) throw new Error("contractId is required");
    if (!amount || amount <= 0) throw new Error("Valid amount is required");

    logStep("Request data", { contractId, amount });

    // Fetch contract details
    const { data: contract, error: contractError } = await supabaseClient
      .from("freelance_contracts")
      .select(`
        *,
        freelancer:profiles!freelance_contracts_freelancer_id_fkey(id, full_name, email),
        freelance_profile:freelance_profiles!inner(stripe_connect_account_id, stripe_connect_onboarded)
      `)
      .eq("id", contractId)
      .single();

    if (contractError) throw new Error(`Contract not found: ${contractError.message}`);
    if (!contract) throw new Error("Contract not found");

    // Verify user is the client
    if (contract.client_id !== user.id) {
      throw new Error("Only the client can fund escrow");
    }

    logStep("Contract found", { 
      contractId: contract.id, 
      freelancerId: contract.freelancer_id,
      clientId: contract.client_id
    });

    // Verify freelancer has Stripe Connect set up
    const freelanceProfile = (contract as any).freelance_profile;
    if (!freelanceProfile?.stripe_connect_account_id) {
      throw new Error("Freelancer has not set up their payment account");
    }
    if (!freelanceProfile.stripe_connect_onboarded) {
      throw new Error("Freelancer has not completed payment onboarding");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL");

    // Get or create Stripe customer for the client
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          platform: "the-quantum-club",
        },
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Calculate amounts
    const amountInCents = Math.round(amount * 100);
    const platformFee = Math.round(amountInCents * (PLATFORM_FEE_PERCENTAGE / 100));
    const freelancerAmount = amountInCents - platformFee;

    logStep("Payment breakdown", { 
      total: amountInCents, 
      platformFee, 
      freelancerAmount,
      currency: "EUR"
    });

    // Create Checkout Session with escrow-style payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card", "ideal", "bancontact"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Project Escrow - Contract #${contractId.slice(0, 8)}`,
              description: `Escrow funding for freelance contract`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        // Hold the payment (don't transfer yet)
        capture_method: "automatic",
        metadata: {
          contract_id: contractId,
          client_id: user.id,
          freelancer_id: contract.freelancer_id,
          freelancer_connect_account: freelanceProfile.stripe_connect_account_id,
          platform_fee: platformFee.toString(),
          freelancer_amount: freelancerAmount.toString(),
          type: "escrow_funding",
        },
        // We'll use on_behalf_of and transfer_data when releasing
      },
      success_url: `${origin}/projects/${contract.project_id}?escrow_funded=true&contract=${contractId}`,
      cancel_url: `${origin}/projects/${contract.project_id}?escrow_cancelled=true`,
      metadata: {
        contract_id: contractId,
        type: "escrow_funding",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update contract with pending escrow status
    await supabaseClient
      .from("freelance_contracts")
      .update({
        escrow_funded: false,
        escrow_amount: amount,
        escrow_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId);

    logStep("Contract updated with escrow info");

    return new Response(JSON.stringify({ 
      success: true, 
      url: session.url,
      sessionId: session.id,
      amount: amount,
      platformFee: platformFee / 100,
      freelancerAmount: freelancerAmount / 100,
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
