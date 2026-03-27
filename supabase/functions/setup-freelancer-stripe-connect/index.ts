import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience, generateIdempotencyKey } from '../_shared/stripe-client.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-SETUP] ${step}${detailsStr}`);
};

Deno.serve(createAuthenticatedHandler(async (req, { supabase, user, corsHeaders }) => {
  logStep("Function started");

  if (!user.email) throw new Error("User email not available");
  logStep("User authenticated", { userId: user.id, email: user.email });

  // Get freelancer profile
  const { data: freelanceProfile, error: profileError } = await supabase
    .from("freelance_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    throw new Error(`Error fetching freelance profile: ${profileError.message}`);
  }

  const stripe = createStripeClient();
  const origin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL");

  // Check if freelancer already has a Stripe Connect account
  if (freelanceProfile?.stripe_connect_account_id) {
    logStep("Existing Stripe Connect account found", {
      accountId: freelanceProfile.stripe_connect_account_id
    });

    // Check if onboarding is complete
    const account = await withStripeResilience(
      () => stripe.accounts.retrieve(freelanceProfile.stripe_connect_account_id),
      { operation: 'retrieve-connect-account' },
    );

    if (account.details_submitted) {
      logStep("Account already fully onboarded");
      return new Response(JSON.stringify({
        success: true,
        message: "Already onboarded",
        accountId: freelanceProfile.stripe_connect_account_id,
        onboarded: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate new onboarding link for incomplete account
    const accountLink = await withStripeResilience(
      () => stripe.accountLinks.create({
        account: freelanceProfile.stripe_connect_account_id,
        refresh_url: `${origin}/projects/freelancer/setup?stripe_refresh=true`,
        return_url: `${origin}/projects/freelancer/setup?stripe_onboarded=true`,
        type: "account_onboarding",
      }),
      { operation: 'create-account-link', idempotencyKey: generateIdempotencyKey(user.id, 'account-link', freelanceProfile.stripe_connect_account_id) },
    );

    logStep("Generated new onboarding link for existing account");
    return new Response(JSON.stringify({
      success: true,
      url: accountLink.url,
      accountId: freelanceProfile.stripe_connect_account_id,
      onboarded: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  // Create new Stripe Connect Express account
  logStep("Creating new Stripe Connect Express account");

  // Get user's full name from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const account = await withStripeResilience(
    () => stripe.accounts.create({
      type: "express",
      country: "NL", // Default to Netherlands, can be made dynamic
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      individual: {
        email: user.email,
        first_name: profile?.full_name?.split(" ")[0] || undefined,
        last_name: profile?.full_name?.split(" ").slice(1).join(" ") || undefined,
      },
      metadata: {
        user_id: user.id,
        platform: "the-quantum-club",
      },
    }),
    { operation: 'create-connect-account', idempotencyKey: generateIdempotencyKey(user.id, 'connect-account') },
  );

  logStep("Stripe Connect account created", { accountId: account.id });

  // Update or create freelance profile with Stripe account ID
  if (freelanceProfile) {
    await supabase
      .from("freelance_profiles")
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_onboarded: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  } else {
    // Create minimal freelance profile
    await supabase
      .from("freelance_profiles")
      .insert({
        user_id: user.id,
        stripe_connect_account_id: account.id,
        stripe_connect_onboarded: false,
        is_available: false,
        hourly_rate: 0,
        categories: [],
      });
  }

  logStep("Freelance profile updated with Stripe account ID");

  // Generate onboarding link
  const accountLink = await withStripeResilience(
    () => stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/projects/freelancer/setup?stripe_refresh=true`,
      return_url: `${origin}/projects/freelancer/setup?stripe_onboarded=true`,
      type: "account_onboarding",
    }),
    { operation: 'create-account-link', idempotencyKey: generateIdempotencyKey(user.id, 'account-link-new', account.id) },
  );

  logStep("Onboarding link generated", { url: accountLink.url });

  return new Response(JSON.stringify({
    success: true,
    url: accountLink.url,
    accountId: account.id,
    onboarded: false
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}));
