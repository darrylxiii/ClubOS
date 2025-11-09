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
    const { bookingId, guestName, guestEmail } = await req.json();
    console.log(`[Meeting] Processing meeting creation for booking: ${bookingId}`);

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
      console.error("[Meeting] Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[Meeting] Booking found: ${booking.guest_name}, create_quantum_meeting=${booking.booking_links?.create_quantum_meeting}`);

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

    // Determine meeting settings based on booking link
    const settings = {
      duration_minutes: booking.booking_links?.duration_minutes || 30,
      video_conferencing_provider: booking.booking_links?.video_conferencing_provider,
      booking_id: bookingId,
    };

    // Create Quantum Club meeting with correct column names
    const { data: meeting, error: meetingError } = await supabaseClient
      .from("meetings")
      .insert({
        title: `${booking.booking_links?.title || 'Meeting'} - ${booking.guest_name}`,
        description: booking.notes || `Booking with ${booking.guest_name} (${booking.guest_email})`,
        scheduled_start: booking.scheduled_start,
        scheduled_end: booking.scheduled_end,
        timezone: booking.timezone || 'UTC',
        host_id: booking.user_id,
        status: 'scheduled',
        access_type: 'invite_only',
        allow_guests: true,
        require_approval: false,
        enable_notetaker: booking.booking_links?.enable_club_ai || false,
        settings: settings,
        host_settings: {
          allowChat: true,
          allowScreenShare: true,
          allowReactions: true,
          allowVideoControl: true,
          allowMicControl: true,
          allowThirdPartyAudio: true,
          allowAddActivities: true,
          accessType: 'open',
          requireHostApproval: false,
        }
      })
      .select()
      .single();

    if (meetingError) {
      console.error("[Meeting] Error creating meeting:", meetingError);
      throw meetingError;
    }

    console.log(`[Meeting] Created Quantum Club meeting: ${meeting.id}, code: ${meeting.meeting_code}`);

    // Add host as participant
    await supabaseClient
      .from("meeting_participants")
      .insert({
        meeting_id: meeting.id,
        user_id: booking.user_id,
        role: 'host',
        status: 'accepted',
      });

    // Add guest as participant with auto-approval (no approval needed for bookings)
    console.log(`[Meeting] Adding guest participant: ${guestName} (${guestEmail})`);
    await supabaseClient
      .from("meeting_participants")
      .insert({
        meeting_id: meeting.id,
        guest_name: guestName,
        guest_email: guestEmail,
        role: 'guest',
        status: 'accepted', // Auto-accept for bookings
        invited_at: new Date().toISOString(),
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
        enableNotetaker: meeting.enable_notetaker,
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
