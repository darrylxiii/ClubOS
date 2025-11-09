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

    // Get pending reminders that need to be sent
    const { data: reminders, error: remindersError } = await supabase
      .from("booking_reminders")
      .select(`
        *,
        bookings!inner(
          *,
          booking_links!inner(*)
        )
      `)
      .eq("status", "pending")
      .lte(
        "send_before_minutes",
        "EXTRACT(EPOCH FROM (scheduled_start - NOW())) / 60"
      );

    if (remindersError) throw remindersError;

    const results = [];

    for (const reminder of reminders || []) {
      try {
        const booking = reminder.bookings as any;
        
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
          .eq("id", reminder.id);

        results.push({ id: reminder.id, status: "sent" });
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
