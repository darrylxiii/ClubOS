import { createHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience, generateIdempotencyKey } from '../_shared/stripe-client.ts';

Deno.serve(createHandler(async (req, { supabase, user, corsHeaders }) => {
  const stripe = createStripeClient();

  const { bookingLinkSlug, guestEmail, guestName, scheduledStart, scheduledEnd, timezone, notes } = await req.json();

  if (!bookingLinkSlug || !guestEmail) {
    throw new Error("Missing required fields: bookingLinkSlug, guestEmail");
  }

  // Get booking link with payment config
  const { data: bookingLink, error: linkError } = await supabase
    .from("booking_links")
    .select("id, user_id, title, payment_required, payment_amount, payment_currency, duration_minutes")
    .eq("slug", bookingLinkSlug)
    .eq("is_active", true)
    .single();

  if (linkError || !bookingLink) {
    throw new Error("Booking link not found or inactive");
  }

  if (!bookingLink.payment_required || !bookingLink.payment_amount) {
    throw new Error("Payment not required for this booking link");
  }

  const amountInCents = Math.round(bookingLink.payment_amount * 100);
  const currency = bookingLink.payment_currency || "eur";
  const origin = req.headers.get("origin") || "https://os.thequantumclub.com";

  // Check existing Stripe customer
  const customers = await withStripeResilience(
    () => stripe.customers.list({ email: guestEmail, limit: 1 }),
    { operation: 'list-customers' },
  );
  let customerId: string | undefined;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  }

  // Create Stripe Checkout session
  const session = await withStripeResilience(
    () => stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : guestEmail,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: bookingLink.title,
              description: `${bookingLink.duration_minutes}-minute booking`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/book/${bookingLinkSlug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book/${bookingLinkSlug}?payment=cancelled`,
      metadata: {
        booking_link_id: bookingLink.id,
        guest_email: guestEmail,
        guest_name: guestName || "",
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        timezone: timezone || "",
        notes: notes || "",
      },
    }),
    { operation: 'create-booking-checkout', idempotencyKey: generateIdempotencyKey(guestEmail, 'booking-checkout', bookingLinkSlug, scheduledStart || '') },
  );

  return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}));
