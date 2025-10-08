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
    const { bookingId, provider } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, booking_links!inner(*)")
      .eq("id", bookingId)
      .single();

    if (bookingError) throw bookingError;

    let videoLink = "";
    let meetingId = "";
    let meetingPassword = "";

    // Generate video link based on provider
    switch (provider) {
      case "google_meet":
        // For now, generate a placeholder Meet link
        // In production, integrate with Google Calendar API to create actual Meet links
        meetingId = `meet-${crypto.randomUUID().substring(0, 10)}`;
        videoLink = `https://meet.google.com/${meetingId}`;
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
