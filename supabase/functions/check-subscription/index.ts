import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience } from '../_shared/stripe-client.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("No customer found");
    return new Response(JSON.stringify({ subscribed: false, subscriptions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  const customerId = customers.data[0].id;
  logStep("Found Stripe customer", { customerId });

  const subscriptions = await withStripeResilience(
    () => stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    }),
    { operation: 'list-subscriptions' },
  );

  const activeSubscriptions = subscriptions.data.map((subscription: any) => ({
    subscription_id: subscription.id,
    product_id: subscription.items.data[0].price.product,
    price_id: subscription.items.data[0].price.id,
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }));

  logStep("Active subscriptions found", { count: activeSubscriptions.length });

  return new Response(JSON.stringify({
    subscribed: activeSubscriptions.length > 0,
    subscriptions: activeSubscriptions,
    customer_id: customerId,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}));
