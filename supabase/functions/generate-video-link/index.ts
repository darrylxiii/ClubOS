import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, provider, realIntegration = false } = await req.json();
    console.log(`[Video Link] Generating ${provider} link for booking ${bookingId}, realIntegration=${realIntegration}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get booking details with owner info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        booking_links!inner(*)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Get booking owner's profile
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.user_id)
      .single();

    let videoLink = "";
    let meetingId = "";
    let meetingPassword = "";

    // Generate video link based on provider
    switch (provider) {
      case "google_meet":
        if (realIntegration) {
          // Real Google Meet integration via Calendar API
          console.log("[Video Link] Creating real Google Meet link");
          
          // Get owner's Google Calendar connection
          const { data: calendarConnection } = await supabase
            .from("calendar_connections")
            .select("*")
            .eq("user_id", booking.user_id)
            .eq("provider", "google")
            .eq("is_active", true)
            .single();

          if (!calendarConnection) {
            throw new Error("No active Google Calendar connection found");
          }

          // Create Google Calendar event with Meet link
          const eventDetails = {
            summary: `${booking.booking_links.title} - ${booking.guest_name}`,
            description: `Booking with ${booking.guest_name}\nEmail: ${booking.guest_email}\n${booking.notes || ''}`,
            start: {
              dateTime: booking.scheduled_start,
              timeZone: booking.timezone || 'UTC',
            },
            end: {
              dateTime: booking.scheduled_end,
              timeZone: booking.timezone || 'UTC',
            },
            attendees: [
              { email: booking.guest_email, displayName: booking.guest_name },
              ...(booking.guests || []).map((g: any) => ({ email: g.email, displayName: g.name })),
              { email: ownerProfile?.email, displayName: ownerProfile?.full_name },
            ].filter(a => a.email),
            conferenceData: {
              createRequest: {
                requestId: `booking-${bookingId}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          };

          console.log("[Video Link] Calling Google Calendar API");
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${calendarConnection.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventDetails),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[Video Link] Google API error:", errorText);
            throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`);
          }

          const createdEvent = await response.json();
          
          videoLink = createdEvent.hangoutLink;
          meetingId = createdEvent.id;
          meetingPassword = createdEvent.conferenceData?.conferenceId || '';
          
          console.log(`[Video Link] Real Google Meet link created: ${videoLink}`);
        } else {
          // Fallback placeholder
          meetingId = `meet-${crypto.randomUUID().substring(0, 10)}`;
          videoLink = `https://meet.google.com/${meetingId}`;
        }
        break;

      case "zoom":
        // Placeholder for Zoom integration
        // In production, use Zoom API to create meetings
        meetingId = Math.floor(100000000 + Math.random() * 900000000).toString();
        meetingPassword = Math.random().toString(36).substring(2, 10);
        videoLink = `https://zoom.us/j/${meetingId}`;
        break;

      case "teams":
        // Placeholder for Microsoft Teams integration
        meetingId = crypto.randomUUID();
        videoLink = `https://teams.microsoft.com/l/meetup-join/${meetingId}`;
        break;

      case "webex":
        // Placeholder for Webex integration
        meetingId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        videoLink = `https://meet.webex.com/${meetingId}`;
        break;

      default:
        throw new Error("Unsupported video provider");
    }

    // Update booking with video link
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        video_meeting_link: videoLink,
        video_meeting_id: meetingId,
        video_meeting_password: meetingPassword || null,
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        videoLink,
        meetingId,
        meetingPassword: meetingPassword || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating video link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
