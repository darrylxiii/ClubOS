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
    const { bookingLinkId, cancelledDate } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabaseClient
      .from("booking_links")
      .select("*")
      .eq("id", bookingLinkId)
      .single();

    if (linkError || !bookingLink) {
      throw new Error("Booking link not found");
    }

    // Find waitlist entries for this date
    const { data: waitlistEntries, error: waitlistError } = await supabaseClient
      .from("booking_waitlist")
      .select("*")
      .eq("booking_link_id", bookingLinkId)
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1);

    if (waitlistError) throw waitlistError;

    if (!waitlistEntries || waitlistEntries.length === 0) {
      return new Response(
        JSON.stringify({ promoted: false, message: "No waitlist entries" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waitlistEntry = waitlistEntries[0];

    // Update waitlist status
    const { error: updateError } = await supabaseClient
      .from("booking_waitlist")
      .update({
        status: "notified",
        notified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour expiry
      })
      .eq("id", waitlistEntry.id);

    if (updateError) throw updateError;

    // Send notification email using Resend
    const bookingUrl = `${Deno.env.get("SITE_URL") || "https://thequantumclub.com"}/book/${bookingLink.slug}`;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "The Quantum Club <bookings@thequantumclub.com>",
          to: [waitlistEntry.guest_email],
          subject: `A Time Slot Opened Up! - ${bookingLink.title}`,
          html: `
            <h1>Great News, ${waitlistEntry.guest_name}!</h1>
            <p>A time slot has opened up for <strong>${bookingLink.title}</strong>.</p>
            <p>You have 24 hours to book this slot before it's offered to the next person on the waitlist.</p>
            <p><a href="${bookingUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Book Now</a></p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        promoted: true,
        notified: waitlistEntry.guest_email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error promoting waitlist:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
