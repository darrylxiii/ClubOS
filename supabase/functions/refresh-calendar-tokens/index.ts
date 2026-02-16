import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[refresh-calendar-tokens] Starting token refresh job");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all calendar connections where token is older than 45 minutes
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    
    const { data: connections, error: fetchError } = await supabaseClient
      .from("calendar_connections")
      .select("*")
      .eq("is_active", true)
      .not("refresh_token", "is", null)
      .lt("updated_at", fortyFiveMinutesAgo);

    if (fetchError) {
      console.error("[refresh-calendar-tokens] Error fetching connections:", fetchError);
      throw fetchError;
    }

    console.log(`[refresh-calendar-tokens] Found ${connections?.length || 0} connections to refresh`);

    let successCount = 0;
    let errorCount = 0;

    if (connections && connections.length > 0) {
      for (const connection of connections) {
        try {
          console.log(`[refresh-calendar-tokens] Refreshing ${connection.provider} token for user ${connection.user_id}`);

          const authFunction = connection.provider === "google"
            ? "google-calendar-auth"
            : "microsoft-calendar-auth";

          const { data: tokenData, error: tokenError } = await supabaseClient.functions.invoke(
            authFunction,
            {
              body: {
                action: "refreshToken",
                refreshToken: connection.refresh_token,
              },
            }
          );

          if (tokenError || !tokenData?.access_token) {
            console.error(`[refresh-calendar-tokens] Failed to refresh token for user ${connection.user_id}:`, tokenError);
            errorCount++;
            continue;
          }

          // Update the connection with new token and expiry
          const newExpiresAt = tokenData.tokens?.expires_at
            || tokenData.expires_at
            || new Date(Date.now() + 3600 * 1000).toISOString();

          const { error: updateError } = await supabaseClient
            .from("calendar_connections")
            .update({
              access_token: tokenData.access_token,
              token_expires_at: newExpiresAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          if (updateError) {
            console.error(`[refresh-calendar-tokens] Failed to update token for user ${connection.user_id}:`, updateError);
            errorCount++;
          } else {
            console.log(`[refresh-calendar-tokens] Successfully refreshed token for user ${connection.user_id}`);
            successCount++;
          }
        } catch (error) {
          console.error(`[refresh-calendar-tokens] Error processing user ${connection.user_id}:`, error);
          errorCount++;
        }
      }
    }

    console.log(`[refresh-calendar-tokens] Job complete. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: connections?.length || 0,
        successful: successCount,
        failed: errorCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[refresh-calendar-tokens] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
