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
    const now = new Date();
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
      .lte("scheduled_for", now.toISOString());

    if (remindersError) {
      console.error("[Reminders] Error fetching reminders:", remindersError);
      throw remindersError;
    }

    console.log(`[Reminders] Found ${reminders?.length || 0} pending reminders to process`);

    const results = [];

    for (const reminder of reminders || []) {
      try {
        const booking = reminder.bookings as any;
        
        console.log(`[Reminders] Processing reminder ${reminder.id} for booking ${booking.id}`);
        
        // Send email reminder (default)
        await supabase.functions.invoke("send-booking-reminder-email", {
          body: {
            email: booking.guest_email,
            name: booking.guest_name,
            bookingLink: booking.booking_links,
            booking: booking,
          },
        });

        // Send SMS reminder if phone provided (future feature)
        if (booking.guest_phone) {
          try {
            await supabase.functions.invoke("send-booking-reminder-sms", {
              body: {
                phone: booking.guest_phone,
                name: booking.guest_name,
                booking: booking,
              },
            });
          } catch (smsError) {
            console.warn(`[Reminders] SMS sending failed (not critical):`, smsError);
          }
        }

        // Update reminder status
        await supabase
          .from("booking_reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);

        console.log(`[Reminders] ✅ Reminder ${reminder.id} sent successfully`);
        results.push({ id: reminder.id, status: "sent" });
      } catch (error: any) {
        console.error(`[Reminders] ❌ Error sending reminder ${reminder.id}:`, error);
        await supabase
          .from("booking_reminders")
          .update({ 
            status: "failed",
            error_message: error.message 
          })
          .eq("id", reminder.id);
        results.push({ id: reminder.id, status: "failed", error: error.message });
      }
    }

    console.log(`[Reminders] Processing complete. Success: ${results.filter(r => r.status === 'sent').length}, Failed: ${results.filter(r => r.status === 'failed').length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length, 
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        results 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[Reminders] Fatal error processing reminders:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
