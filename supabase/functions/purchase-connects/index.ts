import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Connects packages
const CONNECTS_PACKAGES = {
  starter: { connects: 20, price: 499, name: "Starter Pack" },
  standard: { connects: 50, price: 999, name: "Standard Pack" },
  premium: { connects: 100, price: 1799, name: "Premium Pack" },
  enterprise: { connects: 250, price: 3999, name: "Enterprise Pack" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { packageId } = await req.json();
    
    if (!packageId || !CONNECTS_PACKAGES[packageId as keyof typeof CONNECTS_PACKAGES]) {
      throw new Error("Invalid package selected");
    }

    const selectedPackage = CONNECTS_PACKAGES[packageId as keyof typeof CONNECTS_PACKAGES];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create Checkout Session for connects purchase
    const session = await stripe.checkout.sessions.create({
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
    });

    console.log(`[PURCHASE-CONNECTS] Created checkout session for ${selectedPackage.connects} connects`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[PURCHASE-CONNECTS] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
