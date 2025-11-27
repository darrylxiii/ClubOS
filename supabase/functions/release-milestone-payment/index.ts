import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentInput {
  milestoneId: string;
  contractId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { milestoneId, contractId }: PaymentInput = await req.json();

    if (!milestoneId || !contractId) {
      return new Response(
        JSON.stringify({ error: "milestoneId and contractId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch milestone
    const { data: milestone, error: milestoneError } = await supabaseClient
      .from("project_milestones")
      .select("*")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return new Response(
        JSON.stringify({ error: "Milestone not found", details: milestoneError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify milestone is approved
    if (milestone.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Milestone must be approved before payment release" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch contract
    const { data: contract, error: contractError } = await supabaseClient
      .from("project_contracts")
      .select("*")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found", details: contractError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update milestone with payment timestamp
    const { error: updateError } = await supabaseClient
      .from("project_milestones")
      .update({
        paid_at: new Date().toISOString(),
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestoneId);

    if (updateError) {
      console.error("Error updating milestone:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update milestone", details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create payment transaction record
    const { error: transactionError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        contract_id: contractId,
        milestone_id: milestoneId,
        transaction_date: new Date().toISOString(),
        amount: milestone.amount,
        currency_code: contract.currency || "EUR",
        payment_method: "automatic",
        status: "completed",
        notes: `Automatic payment for milestone: ${milestone.title}`,
        processed_by: user.id,
      });

    if (transactionError) {
      console.error("Error creating payment transaction:", transactionError);
      // Don't fail the request if transaction logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment released successfully",
        milestoneId,
        amount: milestone.amount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error releasing milestone payment:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


