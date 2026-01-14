import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending reminders using RPC function that handles time calculation
    const { data: reminders, error: remindersError } = await supabase
      .rpc('get_pending_booking_reminders');

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} pending reminders to process`);

    const results = [];

    for (const reminder of reminders || []) {
      try {
        const booking = reminder.booking_data;
        
        console.log(`Processing reminder ${reminder.id} for booking ${reminder.booking_id}`);

        // Send email reminder
        if (reminder.reminder_type === "email" || reminder.reminder_type === "both") {
          console.log(`Sending email reminder to ${booking.guest_email}`);
          try {
            await supabase.functions.invoke("send-booking-reminder-email", {
              body: {
                email: booking.guest_email,
                name: booking.guest_name,
                bookingLink: booking.booking_link,
                booking: booking,
              },
            });
            console.log(`Email reminder sent successfully for booking ${reminder.booking_id}`);
          } catch (emailError: any) {
            console.error(`Failed to send email reminder for booking ${reminder.booking_id}:`, emailError);
            // Queue for retry - ignore errors on retry queue insert
            try {
              await supabase.from("notification_retry_queue").insert({
                notification_type: "booking_reminder_email",
                recipient_id: booking.user_id,
                payload: { email: booking.guest_email, name: booking.guest_name, booking },
                retry_count: 0,
                next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              });
              console.log("Queued for retry");
            } catch (_retryErr) {
              // Ignore retry queue errors
            }
          }
        }

        // Send SMS reminder - uses existing send-booking-sms-reminder function
        if (reminder.reminder_type === "sms" || reminder.reminder_type === "both") {
          if (booking.guest_phone) {
            console.log(`Sending SMS reminder to ${booking.guest_phone}`);
            try {
              await supabase.functions.invoke("send-booking-sms-reminder", {
                body: {
                  bookingId: reminder.booking_id,
                },
              });
              console.log(`SMS reminder sent successfully for booking ${reminder.booking_id}`);
            } catch (smsError: any) {
              console.error(`Failed to send SMS reminder for booking ${reminder.booking_id}:`, smsError);
              // Queue for retry - ignore errors on retry queue insert
              try {
                await supabase.from("notification_retry_queue").insert({
                  notification_type: "booking_reminder_sms",
                  recipient_id: booking.user_id,
                  payload: { bookingId: reminder.booking_id },
                  retry_count: 0,
                  next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                });
                console.log("Queued for retry");
              } catch (_retryErr) {
                // Ignore retry queue errors
              }
            }
          }
        }

        // Update reminder status
        const { error: updateError } = await supabase
          .from("booking_reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);

        if (updateError) {
          console.error(`Error updating reminder ${reminder.id}:`, updateError);
        }

        results.push({ id: reminder.id, status: "sent" });
        console.log(`Successfully processed reminder ${reminder.id}`);
      } catch (error: any) {
        console.error(`Error sending reminder ${reminder.id}:`, error);
        await supabase
          .from("booking_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        results.push({ id: reminder.id, status: "failed", error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
