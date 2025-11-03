import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Card, Heading, Paragraph, Spacer, InfoRow, Button } from "../_shared/email-templates/components.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, cancelledBy, reason } = await req.json();

    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    console.log("[cancel-booking] Cancelling booking:", bookingId);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*, booking_links(*)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: reason || null,
      })
      .eq("id", bookingId);

    if (updateError) {
      throw updateError;
    }

    console.log("[cancel-booking] Booking status updated to cancelled");

    // Delete calendar event if synced
    const { data: calendarSyncs } = await supabaseClient
      .from("booking_calendar_syncs")
      .select("*, calendar_connections(*)")
      .eq("booking_id", bookingId)
      .eq("sync_status", "synced");

    if (calendarSyncs && calendarSyncs.length > 0) {
      for (const sync of calendarSyncs) {
        try {
          console.log(`[cancel-booking] Deleting event from ${sync.provider} calendar`);

          const functionName = sync.provider === "google"
            ? "google-calendar-events"
            : "microsoft-calendar-events";

          await supabaseClient.functions.invoke(functionName, {
            body: {
              action: "deleteEvent",
              accessToken: sync.calendar_connections.access_token,
              eventId: sync.calendar_event_id,
            },
          });

          // Update sync status
          await supabaseClient
            .from("booking_calendar_syncs")
            .update({
              sync_status: "deleted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", sync.id);

          console.log("[cancel-booking] Calendar event deleted successfully");
        } catch (calendarError) {
          console.error("[cancel-booking] Error deleting calendar event:", calendarError);
          // Mark as failed but continue
          await supabaseClient
            .from("booking_calendar_syncs")
            .update({
              sync_status: "failed",
              error_message: calendarError instanceof Error ? calendarError.message : String(calendarError),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sync.id);
        }
      }
    }

    // Invalidate cache
    const bookingDate = new Date(booking.scheduled_start).toISOString().split("T")[0];
    await supabaseClient
      .from("calendar_busy_times_cache")
      .delete()
      .eq("user_id", booking.booking_links.user_id)
      .eq("date", bookingDate);

    // Send cancellation emails (to both guest and host)
    try {
      const startDate = new Date(booking.scheduled_start);
      const formattedDate = startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = startDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const emailContent = `
        ${Heading({ text: '❌ Meeting Cancelled', level: 1 })}
        ${Spacer(24)}
        ${Paragraph(`Hi ${booking.guest_name},`, 'primary')}
        ${Spacer(16)}
        ${Paragraph('Your upcoming meeting has been cancelled.', 'secondary')}
        ${Spacer(32)}
        ${Card({
          variant: 'default',
          content: `
            ${Heading({ text: booking.booking_links.title, level: 2 })}
            ${Spacer(16)}
            ${InfoRow({ icon: '📅', label: 'Originally scheduled', value: formattedDate })}
            ${InfoRow({ icon: '⏰', label: 'Time', value: formattedTime })}
            ${reason ? InfoRow({ icon: '📝', label: 'Reason', value: reason }) : ''}
          `
        })}
        ${Spacer(32)}
        ${Paragraph('If you\'d like to reschedule, you can book a new time using the original booking link.', 'muted')}
      `;

      const html = baseEmailTemplate({
        preheader: `Meeting cancelled: ${booking.booking_links.title}`,
        content: emailContent,
        showHeader: true,
        showFooter: true
      });

      // Email to guest
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "The Quantum Club <bookings@thequantumclub.com>",
          to: [booking.guest_email],
          subject: `Meeting Cancelled: ${booking.booking_links.title}`,
          html,
        }),
      });

      console.log("[cancel-booking] Cancellation email sent to guest");
    } catch (emailError) {
      console.error("[cancel-booking] Error sending cancellation emails:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Booking cancelled successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[cancel-booking] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
