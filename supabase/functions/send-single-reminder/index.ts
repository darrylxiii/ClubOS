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

  const startTime = Date.now();
  
  try {
    const { reminder_id } = await req.json();
    
    if (!reminder_id) {
      return new Response(
        JSON.stringify({ error: "reminder_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-single-reminder] Processing reminder: ${reminder_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the specific reminder with booking details
    const { data: reminder, error: fetchError } = await supabase
      .from("booking_reminders")
      .select(`
        *,
        bookings!inner(
          *,
          booking_links!inner(*)
        )
      `)
      .eq("id", reminder_id)
      .eq("status", "pending")
      .single();

    if (fetchError || !reminder) {
      console.log(`[send-single-reminder] Reminder not found or already processed: ${reminder_id}`);
      return new Response(
        JSON.stringify({ 
          status: "skipped", 
          reason: "Reminder not found, already sent, or cancelled",
          execution_time_ms: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const booking = reminder.bookings as any;
    let emailSent = false;
    let smsSent = false;

    // Send email reminder
    if (reminder.reminder_type === "email" || reminder.reminder_type === "both") {
      try {
        await supabase.functions.invoke("send-booking-reminder-email", {
          body: {
            email: booking.guest_email,
            name: booking.guest_name,
            bookingLink: booking.booking_links,
            booking: booking,
          },
        });
        emailSent = true;
        console.log(`[send-single-reminder] Email sent for reminder: ${reminder_id}`);
      } catch (emailError: any) {
        console.error(`[send-single-reminder] Email failed: ${emailError.message}`);
      }
    }

    // Send SMS reminder
    if (reminder.reminder_type === "sms" || reminder.reminder_type === "both") {
      if (booking.guest_phone) {
        try {
          await supabase.functions.invoke("send-booking-reminder-sms", {
            body: {
              phone: booking.guest_phone,
              name: booking.guest_name,
              booking: booking,
            },
          });
          smsSent = true;
          console.log(`[send-single-reminder] SMS sent for reminder: ${reminder_id}`);
        } catch (smsError: any) {
          console.error(`[send-single-reminder] SMS failed: ${smsError.message}`);
        }
      }
    }

    // Mark reminder as sent
    const { error: updateError } = await supabase
      .from("booking_reminders")
      .update({ 
        status: "sent", 
        sent_at: new Date().toISOString() 
      })
      .eq("id", reminder_id);

    if (updateError) {
      console.error(`[send-single-reminder] Failed to update status: ${updateError.message}`);
    }

    // Try to unschedule the cron job (self-cleanup)
    try {
      await supabase.rpc('unschedule_booking_reminder', { p_reminder_id: reminder_id });
      console.log(`[send-single-reminder] Cleaned up cron job for: ${reminder_id}`);
    } catch (cronError: any) {
      // Job may not exist or already cleaned up - not critical
      console.log(`[send-single-reminder] Cron cleanup skipped: ${cronError.message}`);
    }

    const executionTime = Date.now() - startTime;
    console.log(`[send-single-reminder] Completed in ${executionTime}ms`);

    return new Response(
      JSON.stringify({ 
        status: "sent",
        reminder_id,
        email_sent: emailSent,
        sms_sent: smsSent,
        execution_time_ms: executionTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[send-single-reminder] Error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
