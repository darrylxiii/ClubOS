import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INVOICE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get invoice_id from request body
    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id is required");
    logStep("Invoice ID received", { invoice_id });

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('partner_invoices')
      .select('*, partner_billing_details!inner(*)')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`);
    }
    logStep("Invoice found", { invoice_number: invoice.invoice_number, amount: invoice.total_amount });

    // Verify user belongs to the company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profile?.company_id !== invoice.partner_company_id) {
      throw new Error("User is not authorized to pay this invoice");
    }
    logStep("User authorized for invoice payment");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: invoice.partner_billing_details.billing_email,
      limit: 1 
    });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: invoice.partner_billing_details.billing_email,
        name: invoice.partner_billing_details.legal_company_name,
        metadata: {
          company_id: invoice.partner_company_id,
          invoice_id: invoice.id,
        },
      });
      customerId = customer.id;
      logStep("New Stripe customer created", { customerId });
    }

    // Create Checkout Session for one-time payment
    const session = await stripe.checkout.sessions.create({
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
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update invoice with Stripe payment intent ID
    await supabaseClient
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
