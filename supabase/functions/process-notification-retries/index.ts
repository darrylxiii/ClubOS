import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 5;
const BACKOFF_MULTIPLIER = 2;
const INITIAL_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[Retry Queue] Starting to process notification retry queue...");

    // Get pending retries that are due
    const { data: pendingRetries, error: fetchError } = await supabase
      .from("notification_retry_queue")
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .lt("retry_count", MAX_RETRIES)
      .order("next_retry_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("[Retry Queue] Error fetching pending retries:", fetchError);
      throw fetchError;
    }

    console.log(`[Retry Queue] Found ${pendingRetries?.length || 0} items to retry`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      exhausted: 0,
    };

    for (const item of pendingRetries || []) {
      try {
        // Mark as processing
        await supabase
          .from("notification_retry_queue")
          .update({ status: "processing" })
          .eq("id", item.id);

        console.log(`[Retry Queue] Processing ${item.notification_type} (attempt ${item.retry_count + 1})`);

        let success = false;
        let errorMessage = "";

        // Route to appropriate handler based on notification type
        switch (item.notification_type) {
          case "booking_reminder_email":
            const emailResult = await supabase.functions.invoke("send-booking-reminder-email", {
              body: item.payload,
            });
            if (emailResult.error) {
              errorMessage = emailResult.error.message;
            } else {
              success = true;
            }
            break;

          case "booking_reminder_sms":
            const smsResult = await supabase.functions.invoke("send-booking-sms-reminder", {
              body: item.payload,
            });
            if (smsResult.error) {
              errorMessage = smsResult.error.message;
            } else {
              success = true;
            }
            break;

          case "push_notification":
            const pushResult = await supabase.functions.invoke("send-push-notification", {
              body: item.payload,
            });
            if (pushResult.error) {
              errorMessage = pushResult.error.message;
            } else {
              success = true;
            }
            break;

          case "email":
            const genericEmailResult = await supabase.functions.invoke("send-email", {
              body: item.payload,
            });
            if (genericEmailResult.error) {
              errorMessage = genericEmailResult.error.message;
            } else {
              success = true;
            }
            break;

          default:
            errorMessage = `Unknown notification type: ${item.notification_type}`;
            console.warn(`[Retry Queue] ${errorMessage}`);
        }

        if (success) {
          // Mark as completed
          await supabase
            .from("notification_retry_queue")
            .update({
              status: "completed",
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          results.succeeded++;
          console.log(`[Retry Queue] Successfully processed ${item.id}`);
        } else {
          // Calculate next retry with exponential backoff
          const newRetryCount = item.retry_count + 1;
          const backoffDelay = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, newRetryCount);
          const nextRetryAt = new Date(Date.now() + backoffDelay).toISOString();

          if (newRetryCount >= MAX_RETRIES) {
            // Mark as permanently failed
            await supabase
              .from("notification_retry_queue")
              .update({
                status: "failed",
                retry_count: newRetryCount,
                last_error: errorMessage,
                processed_at: new Date().toISOString(),
              })
              .eq("id", item.id);

            results.exhausted++;
            console.log(`[Retry Queue] Exhausted retries for ${item.id}`);
          } else {
            // Schedule next retry
            await supabase
              .from("notification_retry_queue")
              .update({
                status: "pending",
                retry_count: newRetryCount,
                next_retry_at: nextRetryAt,
                last_error: errorMessage,
              })
              .eq("id", item.id);

            results.failed++;
            console.log(`[Retry Queue] Retry ${newRetryCount} scheduled for ${item.id} at ${nextRetryAt}`);
          }
        }

        results.processed++;
      } catch (error: any) {
        console.error(`[Retry Queue] Error processing item ${item.id}:`, error);

        // Update with error and schedule retry
        const newRetryCount = item.retry_count + 1;
        if (newRetryCount >= MAX_RETRIES) {
          await supabase
            .from("notification_retry_queue")
            .update({
              status: "failed",
              retry_count: newRetryCount,
              last_error: error.message,
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          results.exhausted++;
        } else {
          const backoffDelay = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, newRetryCount);
          await supabase
            .from("notification_retry_queue")
            .update({
              status: "pending",
              retry_count: newRetryCount,
              next_retry_at: new Date(Date.now() + backoffDelay).toISOString(),
              last_error: error.message,
            })
            .eq("id", item.id);
          results.failed++;
        }

        results.processed++;
      }
    }

    // Cleanup old completed/failed entries (older than 7 days)
    const cleanupDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: cleanedUp } = await supabase
      .from("notification_retry_queue")
      .delete()
      .in("status", ["completed", "failed"])
      .lt("processed_at", cleanupDate);

    if (cleanedUp && cleanedUp > 0) {
      console.log(`[Retry Queue] Cleaned up ${cleanedUp} old entries`);
    }

    console.log(`[Retry Queue] Completed. Results:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        cleaned_up: cleanedUp || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Retry Queue] Error processing retry queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
