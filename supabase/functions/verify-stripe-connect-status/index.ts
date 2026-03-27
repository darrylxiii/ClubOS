import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience } from '../_shared/stripe-client.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-STRIPE-CONNECT] ${step}${detailsStr}`);
};

Deno.serve(createAuthenticatedHandler(async (req, { supabase, user, corsHeaders }) => {
  logStep("Function started");
  logStep("User authenticated", { userId: user.id });

  // Get freelancer profile
  const { data: freelanceProfile, error: profileError } = await supabase
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

  const stripe = createStripeClient();

  // Retrieve account from Stripe
  const account = await withStripeResilience(
    () => stripe.accounts.retrieve(freelanceProfile.stripe_connect_account_id),
    { operation: 'retrieve-connect-account' },
  );

  logStep("Stripe account retrieved", {
    accountId: account.id,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled
  });

  const isOnboarded = account.details_submitted && account.charges_enabled && account.payouts_enabled;

  // Update freelance profile if status changed
  if (isOnboarded !== freelanceProfile.stripe_connect_onboarded) {
    await supabase
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
      const stripeBalance = await withStripeResilience(
        () => stripe.balance.retrieve({
          stripeAccount: freelanceProfile.stripe_connect_account_id,
        }),
        { operation: 'retrieve-balance' },
      );
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
}));
