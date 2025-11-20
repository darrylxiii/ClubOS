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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending reminders using RPC function for proper SQL evaluation
    const { data: reminders, error: remindersError } = await supabase
      .rpc('get_pending_booking_reminders');

    if (remindersError) throw remindersError;

    const results = [];

    for (const reminder of reminders || []) {
      try {
        // RPC returns flat structure - build booking object for compatibility
        const booking = {
          guest_email: reminder.guest_email,
          guest_name: reminder.guest_name,
          guest_phone: reminder.guest_phone,
          scheduled_start: reminder.scheduled_start,
          booking_links: {
            title: reminder.link_title,
            duration_minutes: reminder.duration_minutes,
            user_id: reminder.user_id,
          },
        };
        
        // Send email reminder
        if (reminder.reminder_type === "email" || reminder.reminder_type === "both") {
          await supabase.functions.invoke("send-booking-reminder-email", {
            body: {
              email: booking.guest_email,
              name: booking.guest_name,
              bookingLink: booking.booking_links,
              booking: booking,
            },
          });
        }

        // Send SMS reminder
        if (reminder.reminder_type === "sms" || reminder.reminder_type === "both") {
          if (booking.guest_phone) {
            await supabase.functions.invoke("send-booking-reminder-sms", {
              body: {
                phone: booking.guest_phone,
                name: booking.guest_name,
                booking: booking,
              },
            });
          }
        }

        // Update reminder status
        await supabase
          .from("booking_reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", reminder.reminder_id);

        results.push({ id: reminder.reminder_id, status: "sent" });
      } catch (error: any) {
        console.error(`Error sending reminder ${reminder.reminder_id}:`, error);
        await supabase
          .from("booking_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.reminder_id);
        results.push({ id: reminder.reminder_id, status: "failed", error: error.message });
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
