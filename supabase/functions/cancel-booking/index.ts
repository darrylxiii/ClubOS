import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, reason } = await req.json();

    if (!bookingId || !reason) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId or reason" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking details
    const { data: booking, error: fetchError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        booking_links!inner(
          title,
          user_id,
          profiles:user_id(email, full_name)
        )
      `)
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error("Booking not found");
    }

    if (booking.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Booking already cancelled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // Cancel linked Quantum Club meeting if exists
    if (booking.meeting_id) {
      const { error: meetingCancelError } = await supabaseClient
        .from("meetings")
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.meeting_id);

      if (meetingCancelError) {
        console.error("[Cancel] Failed to cancel linked meeting:", meetingCancelError);
      } else {
        console.log(`[Cancel] Cancelled linked meeting ${booking.meeting_id}`);
      }
    }

    // Delete calendar event if synced
    if (booking.synced_to_calendar && booking.calendar_event_id) {
      try {
        const functionName = booking.calendar_provider === "google"
          ? "google-calendar-events"
          : "microsoft-calendar-events";

        await supabaseClient.functions.invoke(functionName, {
          body: {
            action: "deleteEvent",
            eventId: booking.calendar_event_id,
            connectionId: booking.booking_links.user_id,
          },
        });
      } catch (calError) {
        console.error("Calendar deletion failed:", calError);
      }
    }

    // Send cancellation emails
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const formattedDate = new Date(booking.scheduled_start).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = new Date(booking.scheduled_start).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Email to guest
    const guestContent = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; padding: 8px 16px; background-color: #FEE2E2; color: #DC2626; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 24px;">
          BOOKING CANCELLED
        </div>
      </div>

      <h1 class="text-primary" style="font-size: 28px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
        Your Booking Has Been Cancelled
      </h1>

      <p class="text-secondary" style="font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
        Your booking for <strong>${booking.booking_links.title}</strong> has been cancelled.
      </p>

      <div class="bg-card" style="padding: 24px; border-radius: 12px; margin-bottom: 32px;">
        <h3 class="text-primary" style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Cancelled Booking Details</h3>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px;">
          <tr>
            <td class="text-secondary" style="padding: 8px 0;"><strong>Date:</strong></td>
            <td class="text-primary" style="padding: 8px 0; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td class="text-secondary" style="padding: 8px 0;"><strong>Time:</strong></td>
            <td class="text-primary" style="padding: 8px 0; text-align: right;">${formattedTime}</td>
          </tr>
          <tr>
            <td class="text-secondary" style="padding: 8px 0;"><strong>Reason:</strong></td>
            <td class="text-primary" style="padding: 8px 0; text-align: right;">${reason}</td>
          </tr>
        </table>
      </div>

      <p class="text-secondary" style="font-size: 14px; line-height: 1.6; margin: 0;">
        Need to reschedule? Book a new time at any time.
      </p>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "The Quantum Club <bookings@thequantumclub.nl>",
        to: [booking.guest_email],
        subject: `Booking Cancelled - ${booking.booking_links.title}`,
        html: baseEmailTemplate({ content: guestContent }),
      }),
    });

    // Email to owner
    const ownerEmail = booking.booking_links.profiles?.email;
    if (ownerEmail) {
      const ownerContent = `
        <h1 class="text-primary" style="font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
          Booking Cancellation Notice
        </h1>

        <p class="text-secondary" style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          ${booking.guest_name} has cancelled their booking.
        </p>

        <div class="bg-card" style="padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px;">
            <tr>
              <td class="text-secondary" style="padding: 8px 0;"><strong>Guest:</strong></td>
              <td class="text-primary" style="padding: 8px 0; text-align: right;">${booking.guest_name}</td>
            </tr>
            <tr>
              <td class="text-secondary" style="padding: 8px 0;"><strong>Email:</strong></td>
              <td class="text-primary" style="padding: 8px 0; text-align: right;">${booking.guest_email}</td>
            </tr>
            <tr>
              <td class="text-secondary" style="padding: 8px 0;"><strong>Date:</strong></td>
              <td class="text-primary" style="padding: 8px 0; text-align: right;">${formattedDate}</td>
            </tr>
            <tr>
              <td class="text-secondary" style="padding: 8px 0;"><strong>Time:</strong></td>
              <td class="text-primary" style="padding: 8px 0; text-align: right;">${formattedTime}</td>
            </tr>
            <tr>
              <td class="text-secondary" style="padding: 8px 0;"><strong>Reason:</strong></td>
              <td class="text-primary" style="padding: 8px 0; text-align: right;">${reason}</td>
            </tr>
          </table>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "The Quantum Club <bookings@thequantumclub.nl>",
          to: [ownerEmail],
          subject: `Booking Cancelled - ${booking.guest_name}`,
          html: baseEmailTemplate({ content: ownerContent }),
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
