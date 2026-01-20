import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const handler = async (req: Request): Promise<Response> => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting scheduled email sync...");

    // Get all active connections that need sync
    const { data: connections, error: connError } = await supabase
      .from("email_connections")
      .select("*")
      .eq("is_active", true)
      .eq("sync_enabled", true);

    if (connError) {
      console.error("Error fetching connections:", connError);
      throw connError;
    }

    if (!connections || connections.length === 0) {
      console.log("No active connections to sync");
      return new Response(
        JSON.stringify({ success: true, message: "No active connections" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let totalSynced = 0;
    const results = [];

    // Sync each connection
    for (const conn of connections) {
      try {
        console.log(`Syncing ${conn.provider} for user ${conn.user_id}...`);

        let data;
        let error;

        if (conn.provider === "gmail") {
          const response = await supabase.functions.invoke("sync-gmail-emails", {
            body: { connectionId: conn.id, maxResults: 50 },
          });
          data = response.data;
          error = response.error;
        } else if (conn.provider === "outlook") {
          const response = await supabase.functions.invoke("sync-outlook-emails", {
            body: { connectionId: conn.id, maxResults: 50 },
          });
          data = response.data;
          error = response.error;
        }

        if (error) {
          console.error(`Error syncing ${conn.provider}:`, error);
          results.push({
            connection_id: conn.id,
            provider: conn.provider,
            success: false,
            error: error.message,
          });
        } else {
          const synced = data?.emailsSynced || 0;
          totalSynced += synced;
          console.log(`Synced ${synced} emails for ${conn.provider}`);
          results.push({
            connection_id: conn.id,
            provider: conn.provider,
            success: true,
            emails_synced: synced,
          });
        }
      } catch (error: any) {
        console.error(`Error syncing connection ${conn.id}:`, error);
        results.push({
          connection_id: conn.id,
          provider: conn.provider,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`Sync complete: ${totalSynced} total emails synced`);

    return new Response(
      JSON.stringify({
        success: true,
        totalSynced,
        connectionsProcessed: connections.length,
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in sync-all-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
