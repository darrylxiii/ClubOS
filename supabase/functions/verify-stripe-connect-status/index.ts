import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-STRIPE-CONNECT] ${step}${detailsStr}`);
};

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

    // Get freelancer profile
    const { data: freelanceProfile, error: profileError } = await supabaseClient
      .from("freelance_profiles")
      .select("stripe_connect_account_id, stripe_connect_onboarded")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      logStep("No freelance profile found");
      return new Response(JSON.stringify({ 
        hasAccount: false,
        onboarded: false,
        message: "No freelance profile found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!freelanceProfile.stripe_connect_account_id) {
      logStep("No Stripe Connect account");
      return new Response(JSON.stringify({ 
        hasAccount: false,
        onboarded: false,
        message: "No Stripe Connect account"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(freelanceProfile.stripe_connect_account_id);
    
    logStep("Stripe account retrieved", { 
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });

    const isOnboarded = account.details_submitted && account.charges_enabled && account.payouts_enabled;

    // Update freelance profile if status changed
    if (isOnboarded !== freelanceProfile.stripe_connect_onboarded) {
      await supabaseClient
        .from("freelance_profiles")
        .update({
          stripe_connect_onboarded: isOnboarded,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      logStep("Updated freelance profile onboarded status", { isOnboarded });
    }

    // Get balance if onboarded
    let balance = null;
    if (isOnboarded) {
      try {
        const stripeBalance = await stripe.balance.retrieve({
          stripeAccount: freelanceProfile.stripe_connect_account_id,
        });
        balance = {
          available: stripeBalance.available.map((b: { amount: number; currency: string }) => ({
            amount: b.amount / 100,
            currency: b.currency,
          })),
          pending: stripeBalance.pending.map((b: { amount: number; currency: string }) => ({
            amount: b.amount / 100,
            currency: b.currency,
          })),
        };
        logStep("Balance retrieved", { balance });
      } catch (balanceError) {
        logStep("Could not retrieve balance", { error: balanceError });
      }
    }

    return new Response(JSON.stringify({ 
      hasAccount: true,
      accountId: freelanceProfile.stripe_connect_account_id,
      onboarded: isOnboarded,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      balance,
      requirements: account.requirements,
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
