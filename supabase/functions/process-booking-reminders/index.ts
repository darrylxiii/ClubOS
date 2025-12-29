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
          await supabase.functions.invoke("send-booking-reminder-email", {
            body: {
              email: booking.guest_email,
              name: booking.guest_name,
              bookingLink: booking.booking_link,
              booking: booking,
            },
          });
        }

        // Send SMS reminder
        if (reminder.reminder_type === "sms" || reminder.reminder_type === "both") {
          if (booking.guest_phone) {
            console.log(`Sending SMS reminder to ${booking.guest_phone}`);
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
