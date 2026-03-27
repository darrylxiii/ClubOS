import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience, generateIdempotencyKey } from '../_shared/stripe-client.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

Deno.serve(createAuthenticatedHandler(async (req, { supabase, user, corsHeaders }) => {
  logStep("Function started");

  if (!user.email) throw new Error("User email not available");
  logStep("User authenticated", { userId: user.id, email: user.email });

  const stripe = createStripeClient();
  const customers = await withStripeResilience(
    () => stripe.customers.list({ email: user.email, limit: 1 }),
    { operation: 'list-customers' },
  );
  if (customers.data.length === 0) {
    throw new Error("No Stripe customer found for this user");
  }
  const customerId = customers.data[0].id;
  logStep("Found Stripe customer", { customerId });

  const origin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL");
  const portalSession = await withStripeResilience(
    () => stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/subscription`,
    }),
    { operation: 'create-portal-session', idempotencyKey: generateIdempotencyKey(user.id, 'portal', customerId) },
  );
  logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

  return new Response(JSON.stringify({ url: portalSession.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}));
