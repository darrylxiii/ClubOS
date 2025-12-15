import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    // Verify webhook signature if present
    let event;
    if (signature && Deno.env.get("STRIPE_WEBHOOK_SECRET")) {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET")!
      );
    } else {
      // For direct API calls (admin adding connects manually)
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        
        const data = JSON.parse(body);
        const { userId, connectsAmount, reason } = data;
        
        if (!userId || !connectsAmount) {
          throw new Error("userId and connectsAmount are required");
        }

        // Update freelance_profiles connects_balance
        const { data: profile, error: fetchError } = await supabaseClient
          .from("freelance_profiles")
          .select("connects_balance")
          .eq("user_id", userId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch profile: ${fetchError.message}`);
        }

        const newBalance = (profile?.connects_balance || 0) + connectsAmount;

        const { error: updateError } = await supabaseClient
          .from("freelance_profiles")
          .update({ 
            connects_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (updateError) {
          throw new Error(`Failed to update connects: ${updateError.message}`);
        }

        console.log(`[ADD-CONNECTS] Added ${connectsAmount} connects to user ${userId}. New balance: ${newBalance}`);

        return new Response(JSON.stringify({ 
          success: true, 
          newBalance,
          added: connectsAmount 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      throw new Error("No authentication provided");
    }

    // Handle Stripe webhook for completed checkout
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type === "connects_purchase") {
        const userId = session.metadata.user_id;
        const connectsAmount = parseInt(session.metadata.connects_amount);

        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get current balance
        const { data: profile } = await supabaseClient
          .from("freelance_profiles")
          .select("connects_balance")
          .eq("user_id", userId)
          .single();

        const newBalance = (profile?.connects_balance || 0) + connectsAmount;

        // Update connects balance
        await supabaseClient
          .from("freelance_profiles")
          .update({ 
            connects_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        console.log(`[ADD-CONNECTS] Webhook: Added ${connectsAmount} connects to user ${userId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ADD-CONNECTS] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
