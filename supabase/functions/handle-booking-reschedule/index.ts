import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Card, Heading, Paragraph, Spacer, InfoRow } from "../_shared/email-templates/components.ts";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rescheduleSchema = z.object({
      bookingId: z.string().uuid(),
      newStart: z.string().datetime(),
      newEnd: z.string().datetime(),
      reason: z.string().optional(),
    });

    const { bookingId, newStart, newEnd, reason } = rescheduleSchema.parse(await req.json());

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
          title,
          user_id,
          duration_minutes
        ),
        profiles:user_id (
          full_name,
          email
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

    // Check for conflicts at new time
    const { data: conflicts } = await supabaseClient
      .from("bookings")
      .select("id")
      .eq("user_id", booking.user_id)
      .eq("status", "confirmed")
      .neq("id", bookingId)
      .or(`and(scheduled_start.lt.${newEnd},scheduled_end.gt.${newStart})`);

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: "New time slot is not available" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oldStart = new Date(booking.scheduled_start);
    const newStartDate = new Date(newStart);

    // Update booking
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({
        scheduled_start: newStart,
        scheduled_end: newEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      throw updateError;
    }

    // Update calendar event if synced
    if (booking.synced_to_calendar && booking.calendar_event_id) {
      try {
        const functionName = booking.calendar_provider === 'google' 
          ? 'google-calendar-events' 
          : 'microsoft-calendar-events';

        await supabaseClient.functions.invoke(functionName, {
          body: {
            action: 'updateEvent',
            eventId: booking.calendar_event_id,
            updates: {
              start: newStart,
              end: newEnd,
            }
          }
        });

        console.log(`[Reschedule] Updated calendar event ${booking.calendar_event_id}`);
      } catch (calError) {
        console.error('[Reschedule] Failed to update calendar event:', calError);
      }
    }

    // Update linked Quantum Club meeting if exists
    if (booking.meeting_id) {
      const { error: meetingUpdateError } = await supabaseClient
        .from("meetings")
        .update({
          scheduled_start: newStart,
          scheduled_end: newEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.meeting_id);

      if (meetingUpdateError) {
        console.error('[Reschedule] Failed to update meeting:', meetingUpdateError);
      } else {
        console.log(`[Reschedule] Updated meeting ${booking.meeting_id} to new time`);
      }
    }

    // Send notification emails
    const hostName = booking.profiles?.full_name || "Your host";
    
    const oldTimeFormatted = oldStart.toLocaleString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const newTimeFormatted = newStartDate.toLocaleString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Email to guest
    const guestEmailContent = `
      ${Heading({ text: '🔄 Meeting Rescheduled', level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${booking.guest_name},`, 'primary')}
      ${Spacer(16)}
      ${Paragraph(`Your meeting "${booking.booking_links?.title}" has been rescheduled.`, 'secondary')}
      ${reason ? Spacer(16) + Paragraph(`💬 Reason: ${reason}`, 'secondary') : ''}
      ${Spacer(32)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: 'Time Change', level: 2 })}
          ${Spacer(16)}
          ${InfoRow({ icon: '❌', label: 'Previous time', value: oldTimeFormatted })}
          ${InfoRow({ icon: '✅', label: 'New time', value: newTimeFormatted })}
          ${InfoRow({ icon: '⏱️', label: 'Duration', value: `${booking.booking_links?.duration_minutes} minutes` })}
        `
      })}
      ${Spacer(32)}
      ${Paragraph('Please update your calendar accordingly. We look forward to meeting with you!', 'muted')}
    `;

    const guestEmailHtml = baseEmailTemplate({
      preheader: `Meeting rescheduled: ${booking.booking_links?.title}`,
      content: guestEmailContent,
      showHeader: true,
      showFooter: true
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    // Send email to guest
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "The Quantum Club <bookings@thequantumclub.com>",
        to: [booking.guest_email],
        subject: `Rescheduled: ${booking.booking_links?.title}`,
        html: guestEmailHtml,
      }),
    });

    // Email to host
    if (booking.profiles?.email) {
      const hostEmailContent = `
        ${Heading({ text: '🔄 Booking Rescheduled', level: 1 })}
        ${Spacer(24)}
        ${Paragraph(`Hi ${hostName},`, 'primary')}
        ${Spacer(16)}
        ${Paragraph('A booking has been rescheduled:', 'secondary')}
        ${Spacer(32)}
        ${Card({
          variant: 'default',
          content: `
            ${Heading({ text: booking.booking_links?.title, level: 2 })}
            ${Spacer(16)}
            ${InfoRow({ icon: '👤', label: 'Guest', value: `${booking.guest_name} (${booking.guest_email})` })}
            ${InfoRow({ icon: '✅', label: 'New time', value: newTimeFormatted })}
            ${InfoRow({ icon: '⏱️', label: 'Duration', value: `${booking.booking_links?.duration_minutes} minutes` })}
            ${reason ? InfoRow({ icon: '📝', label: 'Reason', value: reason }) : ''}
          `
        })}
      `;

      const hostEmailHtml = baseEmailTemplate({
        preheader: `Booking rescheduled: ${booking.guest_name}`,
        content: hostEmailContent,
        showHeader: true,
        showFooter: true
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "The Quantum Club <bookings@thequantumclub.com>",
          to: [booking.profiles.email],
          subject: `Booking Rescheduled: ${booking.guest_name}`,
          html: hostEmailHtml,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Reschedule] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
