import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience, generateIdempotencyKey } from '../_shared/stripe-client.ts';

// Connects packages
const CONNECTS_PACKAGES = {
  starter: { connects: 20, price: 499, name: "Starter Pack" },
  standard: { connects: 50, price: 999, name: "Standard Pack" },
  premium: { connects: 100, price: 1799, name: "Premium Pack" },
  enterprise: { connects: 250, price: 3999, name: "Enterprise Pack" },
};

Deno.serve(createAuthenticatedHandler(async (req, { supabase, user, corsHeaders }) => {
  if (!user.email) throw new Error("User email not available");

  const { packageId } = await req.json();

  if (!packageId || !CONNECTS_PACKAGES[packageId as keyof typeof CONNECTS_PACKAGES]) {
    throw new Error("Invalid package selected");
  }

  const selectedPackage = CONNECTS_PACKAGES[packageId as keyof typeof CONNECTS_PACKAGES];

  const stripe = createStripeClient();

  // Get or create Stripe customer
  const customers = await withStripeResilience(
    () => stripe.customers.list({ email: user.email, limit: 1 }),
    { operation: 'list-customers' },
  );
  let customerId: string;

  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await withStripeResilience(
      () => stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      }),
      { operation: 'create-customer', idempotencyKey: generateIdempotencyKey(user.id, 'create-customer', user.email!) },
    );
    customerId = customer.id;
  }

  // Create Checkout Session for connects purchase
  const session = await withStripeResilience(
    () => stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${selectedPackage.name} - ${selectedPackage.connects} Connects`,
              description: `${selectedPackage.connects} connects to submit proposals on Club Projects`,
            },
            unit_amount: selectedPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/projects?connects_purchased=${selectedPackage.connects}`,
      cancel_url: `${req.headers.get("origin")}/projects?connects_cancelled=true`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        connects_amount: selectedPackage.connects.toString(),
        type: "connects_purchase",
      },
    }),
    { operation: 'create-connects-checkout', idempotencyKey: generateIdempotencyKey(user.id, 'connects-checkout', packageId) },
  );

  console.log(`[PURCHASE-CONNECTS] Created checkout session for ${selectedPackage.connects} connects`);

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}));
