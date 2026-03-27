import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience, generateIdempotencyKey } from '../_shared/stripe-client.ts';


const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

Deno.serve(createAuthenticatedHandler(async (req, { supabase, user, corsHeaders }) => {
  logStep("Function started");

  if (!user.email) throw new Error("User email not available");
  logStep("User authenticated", { userId: user.id, email: user.email });

  const { price_id } = await req.json();
  if (!price_id) throw new Error("price_id is required");
  logStep("Price ID received", { price_id });

  const stripe = createStripeClient();
  const customers = await withStripeResilience(
    () => stripe.customers.list({ email: user.email, limit: 1 }),
    { operation: 'list-customers' },
  );
  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    logStep("Existing customer found", { customerId });
  } else {
    logStep("No existing customer, will create during checkout");
  }

  const origin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL");
  const session = await withStripeResilience(
    () => stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    line_items: [
      {
        price: price_id,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    metadata: {
      user_id: user.id,
    },
  }),
    { operation: 'create-checkout-session', idempotencyKey: generateIdempotencyKey(user.id, 'checkout', price_id) },
  );

  logStep("Checkout session created", { sessionId: session.id });

  return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}));
