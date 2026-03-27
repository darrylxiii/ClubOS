import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { createStripeClient, withStripeResilience, generateIdempotencyKey } from '../_shared/stripe-client.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INVOICE-CHECKOUT] ${step}${detailsStr}`);
};

Deno.serve(createAuthenticatedHandler(async (req, { supabase, user, corsHeaders }) => {
  logStep("Function started");

  if (!user.email) throw new Error("User email not available");
  logStep("User authenticated", { userId: user.id, email: user.email });

  // Get invoice_id from request body
  const { invoice_id } = await req.json();
  if (!invoice_id) throw new Error("invoice_id is required");
  logStep("Invoice ID received", { invoice_id });

  // Fetch invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('partner_invoices')
    .select('*, partner_billing_details!inner(*)')
    .eq('id', invoice_id)
    .single();

  if (invoiceError || !invoice) {
    throw new Error(`Invoice not found: ${invoiceError?.message}`);
  }
  logStep("Invoice found", { invoice_number: invoice.invoice_number, amount: invoice.total_amount });

  // Verify user belongs to the company
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profile?.company_id !== invoice.partner_company_id) {
    throw new Error("User is not authorized to pay this invoice");
  }
  logStep("User authorized for invoice payment");

  const stripe = createStripeClient();

  // Check if customer exists
  const customers = await withStripeResilience(
    () => stripe.customers.list({
      email: invoice.partner_billing_details.billing_email,
      limit: 1
    }),
    { operation: 'list-customers' },
  );
  let customerId: string | undefined;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    logStep("Existing Stripe customer found", { customerId });
  } else {
    // Create new customer
    const customer = await withStripeResilience(
      () => stripe.customers.create({
        email: invoice.partner_billing_details.billing_email,
        name: invoice.partner_billing_details.legal_company_name,
        metadata: {
          company_id: invoice.partner_company_id,
          invoice_id: invoice.id,
        },
      }),
      { operation: 'create-customer', idempotencyKey: generateIdempotencyKey(user.id, 'create-customer', invoice.partner_billing_details.billing_email) },
    );
    customerId = customer.id;
    logStep("New Stripe customer created", { customerId });
  }

  // Create Checkout Session for one-time payment
  const session = await withStripeResilience(
    () => stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: invoice.currency_code.toLowerCase(),
            unit_amount: Math.round(invoice.total_amount * 100), // Convert to cents
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for invoice ${invoice.invoice_number}`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/partner/billing?payment=success&invoice_id=${invoice.id}`,
      cancel_url: `${req.headers.get("origin")}/partner/billing?payment=cancelled`,
      metadata: {
        invoice_id: invoice.id,
        company_id: invoice.partner_company_id,
      },
    }),
    { operation: 'create-invoice-checkout', idempotencyKey: generateIdempotencyKey(user.id, 'invoice-checkout', invoice_id) },
  );

  logStep("Checkout session created", { sessionId: session.id, url: session.url });

  // Update invoice with Stripe payment intent ID
  await supabase
    .from('partner_invoices')
    .update({
      stripe_payment_intent_id: session.payment_intent as string,
      viewed_at: new Date().toISOString(),
      status: invoice.status === 'draft' ? 'sent' : invoice.status,
    })
    .eq('id', invoice.id);

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}));
