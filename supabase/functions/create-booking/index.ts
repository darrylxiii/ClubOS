import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      bookingLinkSlug,
      guestName,
      guestEmail,
      guestPhone,
      scheduledStart,
      scheduledEnd,
      timezone,
      customResponses,
      notes,
    } = await req.json();

    // Use service role to bypass RLS for secure booking creation
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabaseClient
      .from("booking_links")
      .select("*")
      .eq("slug", bookingLinkSlug)
      .eq("is_active", true)
      .single();

    if (linkError || !bookingLink) {
      return new Response(
        JSON.stringify({ error: "Booking link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for conflicts
    const { data: existingBookings } = await supabaseClient
      .from("bookings")
      .select("id")
      .eq("user_id", bookingLink.user_id)
      .eq("status", "confirmed")
      .or(`and(scheduled_start.lt.${scheduledEnd},scheduled_end.gt.${scheduledStart})`);

    if (existingBookings && existingBookings.length > 0) {
      return new Response(
        JSON.stringify({ error: "This time slot is no longer available" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        booking_link_id: bookingLink.id,
        user_id: bookingLink.user_id,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        timezone: timezone,
        custom_responses: customResponses || {},
        notes: notes,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookingError) {
      throw bookingError;
    }

    // Send confirmation email
    try {
      await supabaseClient.functions.invoke("send-booking-confirmation", {
        body: {
          booking: booking,
          bookingLink: bookingLink,
        },
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        redirectUrl: bookingLink.redirect_url 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});