import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get secrets
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const businessAccountId = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");
    const webhookVerifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    console.log("[activate-whatsapp] Checking secrets configuration...");

    const missingSecrets: string[] = [];
    if (!accessToken) missingSecrets.push("WHATSAPP_ACCESS_TOKEN");
    if (!phoneNumberId) missingSecrets.push("WHATSAPP_PHONE_NUMBER_ID");
    if (!businessAccountId) missingSecrets.push("WHATSAPP_BUSINESS_ACCOUNT_ID");
    if (!webhookVerifyToken) missingSecrets.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    if (missingSecrets.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required secrets",
          missing: missingSecrets,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify connection to Meta API
    console.log("[activate-whatsapp] Verifying Meta API connection...");
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaResponse.ok) {
      const errorData = await metaResponse.json();
      console.error("[activate-whatsapp] Meta API error:", errorData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to verify Meta API connection",
          details: errorData.error?.message || "Invalid credentials",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phoneData = await metaResponse.json();
    console.log("[activate-whatsapp] Phone data retrieved:", {
      display_phone_number: phoneData.display_phone_number,
      verified_name: phoneData.verified_name,
      quality_rating: phoneData.quality_rating,
    });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if account exists
    const { data: existingAccount, error: fetchError } = await supabase
      .from("whatsapp_business_accounts")
      .select("id")
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("[activate-whatsapp] Fetch error:", fetchError);
    }

    const accountData = {
      phone_number_id: phoneNumberId,
      business_account_id: businessAccountId,
      display_phone_number: phoneData.display_phone_number || "+31622888444",
      verified_name: phoneData.verified_name || "The Quantum Club",
      quality_rating: phoneData.quality_rating || "GREEN",
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingAccount) {
      // Update existing account
      console.log("[activate-whatsapp] Updating existing account:", existingAccount.id);
      const { data, error } = await supabase
        .from("whatsapp_business_accounts")
        .update(accountData)
        .eq("id", existingAccount.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new account
      console.log("[activate-whatsapp] Creating new account...");
      const { data, error } = await supabase
        .from("whatsapp_business_accounts")
        .insert({
          ...accountData,
          access_token_encrypted: "***", // Token stored in secrets, not DB
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log("[activate-whatsapp] Account activated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: result.id,
          display_phone_number: result.display_phone_number,
          verified_name: result.verified_name,
          quality_rating: result.quality_rating,
          is_active: result.is_active,
        },
        webhook_url: `${supabaseUrl}/functions/v1/whatsapp-webhook-receiver`,
        next_steps: [
          "Configure webhook URL in Meta Business Suite",
          "Subscribe to messages, message_deliveries, message_reads events",
          "Sync message templates",
          "Send a test message",
        ],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[activate-whatsapp] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to activate WhatsApp account";
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
