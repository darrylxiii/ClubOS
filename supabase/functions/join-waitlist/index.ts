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
    const { bookingLinkId, guestName, guestEmail, guestPhone, preferredDates } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify booking link exists and allows waitlist
    const { data: bookingLink, error: linkError } = await supabase
      .from("booking_links")
      .select("*")
      .eq("id", bookingLinkId)
      .eq("allow_waitlist", true)
      .single();

    if (linkError || !bookingLink) {
      throw new Error("Booking link not found or doesn't allow waitlist");
    }

    // Add to waitlist
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from("booking_waitlist")
      .insert({
        booking_link_id: bookingLinkId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        preferred_dates: preferredDates,
      })
      .select()
      .single();

    if (waitlistError) throw waitlistError;

    // Send confirmation email
    await supabase.functions.invoke("send-waitlist-confirmation", {
      body: {
        email: guestEmail,
        name: guestName,
        bookingLink: bookingLink,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        waitlistEntry,
        message: "Successfully joined waitlist. We'll notify you when a spot opens up.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error joining waitlist:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
