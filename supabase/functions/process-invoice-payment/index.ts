import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-INVOICE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      // Verify webhook signature
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errorMsg });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
      logStep("Processing webhook without signature verification (dev mode)");
    }

    logStep("Processing event", { type: event.type });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoice_id;
        
        if (!invoiceId) {
          logStep("No invoice_id in session metadata");
          break;
        }

        logStep("Checkout session completed", { invoiceId, sessionId: session.id });

        // Update invoice status to paid
        const { error: updateError } = await supabaseClient
          .from('partner_invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('id', invoiceId);

        if (updateError) {
          logStep("Error updating invoice", { error: updateError });
          throw updateError;
        }

        // Update placement fees to paid
        await supabaseClient
          .from('placement_fees')
          .update({ status: 'paid' })
          .eq('invoice_id', invoiceId);

        // Create payment transaction record
        await supabaseClient
          .from('payment_transactions')
          .insert({
            invoice_id: invoiceId,
            transaction_date: new Date().toISOString(),
            amount: (session.amount_total || 0) / 100, // Convert from cents
            currency_code: (session.currency || 'EUR').toUpperCase(),
            payment_method: 'stripe',
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_charge_id: session.payment_intent as string,
            status: 'completed',
            notes: 'Automatic payment via Stripe Checkout',
          });

        logStep("Invoice payment processed successfully", { invoiceId });
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { paymentIntentId: paymentIntent.id });
        
        // Find invoice by payment intent ID
        const { data: invoice } = await supabaseClient
          .from('partner_invoices')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (invoice) {
          await supabaseClient
            .from('partner_invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);
          
          logStep("Invoice marked as paid", { invoiceId: invoice.id });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent failed", { 
          paymentIntentId: paymentIntent.id, 
          error: paymentIntent.last_payment_error?.message 
        });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
