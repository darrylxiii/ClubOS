import { createHandler } from '../_shared/handler.ts';
import { createStripeClient, Stripe } from '../_shared/stripe-client.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-INVOICE-PAYMENT] ${step}${detailsStr}`);
};

Deno.serve(createHandler(async (req, ctx) => {
    logStep("Webhook received");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    const stripe = createStripeClient();

    const supabaseClient = ctx.supabase;

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
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Dev-mode bypass: only allow in development
      if (Deno.env.get('DENO_ENV') !== 'development') {
        throw new Error('STRIPE_WEBHOOK_SECRET required in production');
      }
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
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
}));
