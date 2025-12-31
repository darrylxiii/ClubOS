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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bookingId, action, rejectionReason } = await req.json();

    if (!bookingId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: bookingId and action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'approve' or 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the booking and verify ownership
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        booking_links!inner(
          id,
          title,
          user_id,
          create_quantum_meeting,
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

    // Verify user owns this booking
    if (booking.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to manage this booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify booking is in pending status
    if (booking.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Booking is already ${booking.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      // Update booking status to confirmed
      const { error: updateError } = await supabaseClient
        .from("bookings")
        .update({
          status: "confirmed",
          approved_at: now,
          approved_by: user.id,
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Update approval request if exists
      await supabaseClient
        .from("booking_approval_requests")
        .update({
          status: "approved",
          reviewed_at: now,
          reviewed_by: user.id,
        })
        .eq("booking_id", bookingId);

      // Trigger meeting creation if configured
      if (booking.booking_links?.create_quantum_meeting) {
        console.log("[Approve Booking] Triggering meeting creation for approved booking");
        
        try {
          await supabaseClient.functions.invoke("create-meeting-from-booking", {
            body: { bookingId }
          });
        } catch (meetingError) {
          console.error("[Approve Booking] Failed to create meeting:", meetingError);
          // Don't fail the approval if meeting creation fails
        }
      }

      // Send confirmation email to guest
      try {
        await supabaseClient.functions.invoke("send-booking-confirmation", {
          body: {
            booking: { ...booking, status: "confirmed" },
            bookingLink: booking.booking_links,
          },
        });
      } catch (emailError) {
        console.error("[Approve Booking] Failed to send confirmation email:", emailError);
      }

      // Sync to calendar
      if (booking.booking_links?.primary_calendar_id) {
        try {
          await supabaseClient.functions.invoke("sync-booking-to-calendar", {
            body: { bookingId }
          });
        } catch (syncError) {
          console.error("[Approve Booking] Failed to sync to calendar:", syncError);
        }
      }

      console.log("[Approve Booking] Successfully approved booking:", bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          action: "approved",
          bookingId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "reject") {
      // Update booking status to cancelled with rejection reason
      const { error: updateError } = await supabaseClient
        .from("bookings")
        .update({
          status: "cancelled",
          rejection_reason: rejectionReason || "Booking request declined",
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Update approval request
      await supabaseClient
        .from("booking_approval_requests")
        .update({
          status: "rejected",
          reviewed_at: now,
          reviewed_by: user.id,
          notes: rejectionReason,
        })
        .eq("booking_id", bookingId);

      // Send rejection email to guest
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "The Quantum Club <bookings@thequantumclub.com>",
              to: [booking.guest_email],
              subject: `Booking Request Update - ${booking.booking_links?.title || "Meeting"}`,
              html: `
                <p>Hi ${booking.guest_name},</p>
                <p>Unfortunately, your booking request for <strong>${booking.booking_links?.title || "the meeting"}</strong> could not be confirmed.</p>
                ${rejectionReason ? `<p>Reason: ${rejectionReason}</p>` : ""}
                <p>Please feel free to request a different time slot.</p>
                <p>Best regards,<br>The Quantum Club</p>
              `,
            }),
          });
        } catch (emailError) {
          console.error("[Approve Booking] Failed to send rejection email:", emailError);
        }
      }

      console.log("[Approve Booking] Successfully rejected booking:", bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          action: "rejected",
          bookingId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Approve Booking] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
