import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { bookingLinkSlug, guestEmail, guestName, scheduledStart, scheduledEnd, timezone, notes } = await req.json();

    if (!bookingLinkSlug || !guestEmail) {
      throw new Error("Missing required fields: bookingLinkSlug, guestEmail");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get booking link with payment config
    const { data: bookingLink, error: linkError } = await supabaseClient
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
    const origin = req.headers.get("origin") || "https://thequantumclub.lovable.app";

    // Check existing Stripe customer
    const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
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
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[process-booking-payment] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
