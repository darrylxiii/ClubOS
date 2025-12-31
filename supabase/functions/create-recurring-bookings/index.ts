import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple RRULE parser for common patterns
function parseRRule(rrule: string): { freq: string; interval: number; count?: number; until?: Date } {
  const parts = rrule.replace("RRULE:", "").split(";");
  const result: any = { freq: "WEEKLY", interval: 1 };
  
  for (const part of parts) {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        result.freq = value;
        break;
      case "INTERVAL":
        result.interval = parseInt(value, 10);
        break;
      case "COUNT":
        result.count = parseInt(value, 10);
        break;
      case "UNTIL":
        result.until = new Date(value.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z"));
        break;
    }
  }
  
  return result;
}

function getNextOccurrence(date: Date, freq: string, interval: number): Date {
  const next = new Date(date);
  
  switch (freq) {
    case "DAILY":
      next.setDate(next.getDate() + interval);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + (7 * interval));
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + interval);
      break;
  }
  
  return next;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parentBookingId, recurrenceRule, occurrenceCount = 10, maxDate } = await req.json();
    
    console.log(`[RecurringBookings] Creating occurrences for booking ${parentBookingId}`);
    console.log(`[RecurringBookings] Rule: ${recurrenceRule}, count: ${occurrenceCount}`);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the parent booking
    const { data: parentBooking, error: parentError } = await supabaseClient
      .from("bookings")
      .select("*, booking_links(*)")
      .eq("id", parentBookingId)
      .single();

    if (parentError || !parentBooking) {
      console.error("[RecurringBookings] Parent booking not found:", parentError);
      return new Response(
        JSON.stringify({ error: "Parent booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the recurrence rule
    const rrule = parseRRule(recurrenceRule);
    console.log(`[RecurringBookings] Parsed rule:`, rrule);

    // Generate series ID for this recurrence series
    const seriesId = crypto.randomUUID();
    
    // Update parent booking with series info
    await supabaseClient
      .from("bookings")
      .update({
        recurrence_rule: recurrenceRule,
        series_id: seriesId,
        recurrence_index: 0,
      })
      .eq("id", parentBookingId);

    // Calculate occurrences
    const occurrences: any[] = [];
    let currentStart = new Date(parentBooking.scheduled_start);
    let currentEnd = new Date(parentBooking.scheduled_end);
    const duration = currentEnd.getTime() - currentStart.getTime();
    
    const maxOccurrences = rrule.count || occurrenceCount;
    const untilDate = rrule.until || (maxDate ? new Date(maxDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)); // Default 90 days

    for (let i = 1; i < maxOccurrences && currentStart < untilDate; i++) {
      currentStart = getNextOccurrence(currentStart, rrule.freq, rrule.interval);
      currentEnd = new Date(currentStart.getTime() + duration);
      
      if (currentStart > untilDate) break;

      occurrences.push({
        booking_link_id: parentBooking.booking_link_id,
        user_id: parentBooking.user_id,
        guest_name: parentBooking.guest_name,
        guest_email: parentBooking.guest_email,
        guest_phone: parentBooking.guest_phone,
        scheduled_start: currentStart.toISOString(),
        scheduled_end: currentEnd.toISOString(),
        timezone: parentBooking.timezone,
        custom_responses: parentBooking.custom_responses,
        notes: parentBooking.notes,
        status: "confirmed",
        recurrence_rule: recurrenceRule,
        recurrence_parent_id: parentBookingId,
        recurrence_index: i,
        series_id: seriesId,
        metadata: {
          ...parentBooking.metadata,
          is_recurring_instance: true,
          parent_booking_id: parentBookingId,
        },
      });
    }

    console.log(`[RecurringBookings] Generated ${occurrences.length} occurrences`);

    // Insert all occurrences
    const { data: createdBookings, error: insertError } = await supabaseClient
      .from("bookings")
      .insert(occurrences)
      .select();

    if (insertError) {
      console.error("[RecurringBookings] Failed to create occurrences:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create recurring bookings", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[RecurringBookings] Created ${createdBookings?.length || 0} recurring bookings`);

    // Create meetings for each occurrence if quantum meeting is enabled
    if (parentBooking.booking_links?.create_quantum_meeting) {
      for (const booking of createdBookings || []) {
        try {
          await supabaseClient.functions.invoke("create-meeting-from-booking", {
            body: { bookingId: booking.id }
          });
        } catch (meetingError) {
          console.warn(`[RecurringBookings] Failed to create meeting for booking ${booking.id}:`, meetingError);
        }
      }
    }

    // Send confirmation email with series info
    try {
      await supabaseClient.functions.invoke("send-booking-confirmation", {
        body: {
          booking: parentBooking,
          bookingLink: parentBooking.booking_links,
          isRecurringSeries: true,
          occurrenceCount: occurrences.length + 1,
        },
      });
    } catch (emailError) {
      console.warn("[RecurringBookings] Failed to send confirmation:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        seriesId,
        parentBookingId,
        createdCount: createdBookings?.length || 0,
        bookings: createdBookings,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[RecurringBookings] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
