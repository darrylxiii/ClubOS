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
    // Include entity linking for interview intelligence integration
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
        // Entity linking for ML/RAG integration
        candidate_id: booking.candidate_id || null,
        job_id: booking.job_id || null,
        application_id: booking.application_id || null,
        booking_id: bookingId,
        meeting_type: booking.is_interview_booking ? 'interview' : 'general',
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

    // Add guest as participant (with email for join verification)
    const { error: guestParticipantError } = await supabaseClient
      .from("meeting_participants")
      .insert({
        meeting_id: meeting.id,
        user_id: null, // Guest doesn't have a user account
        email: booking.guest_email,
        display_name: booking.guest_name,
        role: 'guest',
        status: 'accepted',
      });

    if (guestParticipantError) {
      console.warn("[Meeting] Could not add guest as participant:", guestParticipantError.message);
    } else {
      console.log(`[Meeting] Added guest ${booking.guest_email} as meeting participant`);
    }

    // Generate quantum meeting link for the booking
    const quantumMeetingLink = `${Deno.env.get("APP_URL") || 'https://app.thequantumclub.com'}/meeting/${meeting.meeting_code}`;

    // Update booking with meeting link as well
    await supabaseClient
      .from("bookings")
      .update({ 
        meeting_id: meeting.id,
        quantum_meeting_link: quantumMeetingLink,
        video_meeting_link: quantumMeetingLink, // Also set as primary video link
      })
      .eq("id", bookingId);

    // Create in-app notification for host about meeting creation
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        type: 'meeting_reminder',
        title: `Meeting room created for ${booking.guest_name}`,
        content: `Your meeting with ${booking.guest_name} is ready. Meeting code: ${meeting.meeting_code}`,
        action_url: `/meeting/${meeting.meeting_code}`,
        metadata: {
          meeting_id: meeting.id,
          meeting_code: meeting.meeting_code,
          booking_id: bookingId,
          guest_name: booking.guest_name,
          scheduled_start: booking.scheduled_start,
        },
        is_read: false,
      });
    console.log(`[Meeting] Created in-app notification for host about meeting creation`);

    // Create in-app notification for guest if they have an account
    const { data: guestUser } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', booking.guest_email)
      .single();
    
    if (guestUser) {
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: guestUser.id,
          type: 'meeting_reminder',
          title: `Meeting room ready: ${booking.booking_links?.title || 'Meeting'}`,
          content: `Your meeting is scheduled and ready. Click to join when it's time.`,
          action_url: `/meeting/${meeting.meeting_code}`,
          metadata: {
            meeting_id: meeting.id,
            meeting_code: meeting.meeting_code,
            booking_id: bookingId,
            scheduled_start: booking.scheduled_start,
          },
          is_read: false,
        });
      console.log(`[Meeting] Created in-app notification for guest about meeting`);
    }

    // Send guest notification email with meeting details
    try {
      await supabaseClient.functions.invoke("send-meeting-invite", {
        body: {
          meetingId: meeting.id,
          recipientEmail: booking.guest_email,
          recipientName: booking.guest_name,
          meetingLink: quantumMeetingLink,
          meetingTitle: `${booking.booking_links?.title || 'Meeting'} - ${booking.guest_name}`,
          scheduledStart: booking.scheduled_start,
          scheduledEnd: booking.scheduled_end,
          timezone: booking.timezone,
          isE2EEncrypted: meeting.is_e2e_encrypted || false,
        },
      });
      console.log(`[Meeting] Guest notification email sent to ${booking.guest_email}`);
    } catch (emailError) {
      console.warn("[Meeting] Failed to send guest notification email:", emailError);
    }


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
