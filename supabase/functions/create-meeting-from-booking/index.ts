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

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        booking_links (
          *,
          create_quantum_meeting,
          enable_club_ai
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

    // Check if we should create a Quantum Club meeting
    if (!booking.booking_links?.create_quantum_meeting) {
      console.log("[Meeting] Quantum meeting creation disabled for this booking link");
      return new Response(
        JSON.stringify({ success: false, message: "Meeting creation disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if meeting already exists
    if (booking.meeting_id) {
      console.log("[Meeting] Meeting already exists for this booking");
      return new Response(
        JSON.stringify({ success: true, meetingId: booking.meeting_id, existing: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine meeting link
    let meetingLink = booking.booking_links?.meeting_link;
    
    // If video conferencing type is set but no link, we could generate one
    // For now, use the configured link or make it joinable later
    if (!meetingLink && booking.booking_links?.video_conferencing_type) {
      // Meeting will be joinable via Quantum Club interface
      meetingLink = `${Deno.env.get("SUPABASE_URL")}/meetings/join?booking=${bookingId}`;
    }

    // Create Quantum Club meeting
    const { data: meeting, error: meetingError } = await supabaseClient
      .from("meetings")
      .insert({
        title: `${booking.booking_links?.title || 'Meeting'} - ${booking.guest_name}`,
        description: booking.notes || `Booking with ${booking.guest_name} (${booking.guest_email})`,
        start_time: booking.scheduled_start,
        end_time: booking.scheduled_end,
        meeting_link: meetingLink,
        created_by: booking.user_id,
        is_recurring: false,
        enable_club_ai: booking.booking_links?.enable_club_ai || false,
        metadata: {
          booking_id: bookingId,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          guest_phone: booking.guest_phone,
          booking_type: 'external_booking',
        }
      })
      .select()
      .single();

    if (meetingError) {
      console.error("[Meeting] Error creating meeting:", meetingError);
      throw meetingError;
    }

    console.log(`[Meeting] Created Quantum Club meeting: ${meeting.id}`);

    // Add host as participant
    await supabaseClient
      .from("meeting_participants")
      .insert({
        meeting_id: meeting.id,
        user_id: booking.user_id,
        role: 'host',
        status: 'accepted',
      });

    // Update booking with meeting ID
    await supabaseClient
      .from("bookings")
      .update({ meeting_id: meeting.id })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({ 
        success: true,
        meetingId: meeting.id,
        meetingCode: meeting.meeting_code,
        enableClubAI: meeting.enable_club_ai,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Meeting] Error creating meeting from booking:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
