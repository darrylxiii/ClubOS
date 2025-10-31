import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { bookingId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking details with booking link info
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        booking_links (
          *,
          primary_calendar_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get primary calendar connection
    const calendarId = booking.booking_links?.primary_calendar_id;
    
    if (!calendarId) {
      console.log("[Sync] No primary calendar set for this booking link");
      return new Response(
        JSON.stringify({ success: false, message: "No calendar configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: calendar, error: calendarError } = await supabaseClient
      .from("calendar_connections")
      .select("*")
      .eq("id", calendarId)
      .eq("is_active", true)
      .single();

    if (calendarError || !calendar) {
      console.error("[Sync] Calendar connection not found or inactive");
      return new Response(
        JSON.stringify({ error: "Calendar not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare event details
    const eventDetails = {
      summary: `${booking.booking_links?.title || 'Meeting'} - ${booking.guest_name}`,
      description: `
Booking with: ${booking.guest_name}
Email: ${booking.guest_email}
${booking.guest_phone ? `Phone: ${booking.guest_phone}\n` : ''}
${booking.notes ? `Notes: ${booking.notes}\n` : ''}
${booking.booking_links?.meeting_link ? `\nMeeting Link: ${booking.booking_links.meeting_link}` : ''}
      `.trim(),
      start: booking.scheduled_start,
      end: booking.scheduled_end,
      attendees: [booking.guest_email],
      location: booking.booking_links?.location || '',
    };

    // Create event in the appropriate calendar
    let calendarEventId: string | null = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
      const functionName = calendar.provider === 'google' 
        ? 'google-calendar-events' 
        : 'microsoft-calendar-events';

      const { data: eventData, error: eventError } = await supabaseClient.functions.invoke(
        functionName,
        {
          body: {
            action: 'createEvent',
            connectionId: calendar.id,
            event: eventDetails,
          }
        }
      );

      if (eventError) {
        throw eventError;
      }

      if (eventData?.eventId) {
        calendarEventId = eventData.eventId;
        success = true;
        console.log(`[Sync] Successfully created ${calendar.provider} calendar event: ${calendarEventId}`);
      }
    } catch (error: any) {
      console.error(`[Sync] Error creating calendar event:`, error);
      errorMessage = error.message;
    }

    // Update booking with sync status
    if (success && calendarEventId) {
      await supabaseClient
        .from("bookings")
        .update({
          synced_to_calendar: true,
          calendar_event_id: calendarEventId,
          calendar_provider: calendar.provider,
        })
        .eq("id", bookingId);
    }

    // Log sync attempt
    await supabaseClient
      .from("calendar_sync_log")
      .insert({
        booking_id: bookingId,
        action: 'created',
        provider: calendar.provider,
        success: success,
        error_message: errorMessage,
        calendar_event_id: calendarEventId,
      });

    return new Response(
      JSON.stringify({ 
        success,
        calendarEventId,
        provider: calendar.provider,
        error: errorMessage 
      }),
      { status: success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Sync] Error syncing booking to calendar:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
