import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, InfoRow, StatusBadge
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { z, parseBody, uuidSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

Deno.serve(createHandler(async (req, ctx) => {
  // Rate limiting: 10 cancellations per 15 minutes per IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimit = await checkUserRateLimit(clientIp, 'cancel-booking', 10, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.retryAfter!, ctx.corsHeaders);
  }

  const cancelSchema = z.object({
    bookingId: uuidSchema,
    reason: z.string().min(1, 'Reason is required').max(1000).trim(),
  });

  const parsed = await parseBody(req, cancelSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { bookingId, reason } = parsed.data;

  const safeReason = sanitizeForEmail(reason);

  // Get booking details first
  const { data: booking, error: fetchError } = await ctx.supabase
    .from("bookings")
    .select(`
      *,
      booking_links!inner(
        title,
        user_id
      )
    `)
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("[cancel-booking] Booking fetch error:", fetchError);
    throw new Error("Booking not found");
  }

  // Fetch owner profile separately (more robust than nested query)
  const { data: ownerProfile, error: profileError } = await ctx.supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", booking.booking_links.user_id)
    .single();

  if (profileError) {
    console.error("[cancel-booking] Owner profile fetch error:", profileError);
  }

  console.log("[cancel-booking] Owner profile:", ownerProfile?.email || "not found");

  if (booking.status === "cancelled") {
    return new Response(
      JSON.stringify({ error: "Booking already cancelled" }),
      { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update booking status
  const { error: updateError } = await ctx.supabase
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
    const { error: meetingCancelError } = await ctx.supabase
      .from("meetings")
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.meeting_id);

    if (meetingCancelError) {
      console.error("[cancel-booking] Failed to cancel linked meeting:", meetingCancelError);
    } else {
      console.log(`[cancel-booking] Cancelled linked meeting ${booking.meeting_id}`);
    }
  }

  // Delete calendar event if synced
  if (booking.synced_to_calendar && booking.calendar_event_id) {
    try {
      const functionName = booking.calendar_provider === "google"
        ? "google-calendar-events"
        : "microsoft-calendar-events";

      await ctx.supabase.functions.invoke(functionName, {
        body: {
          action: "deleteEvent",
          eventId: booking.calendar_event_id,
          connectionId: booking.booking_links.user_id,
        },
      });
    } catch (calError) {
      console.error("[cancel-booking] Calendar deletion failed:", calError);
    }
  }

  // Send cancellation emails
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
    ${StatusBadge({ status: 'cancelled', text: 'BOOKING CANCELLED' })}
    ${Heading({ text: 'Your Booking Has Been Cancelled', level: 1 })}
    ${Spacer(8)}
    ${Paragraph(`Your booking for <strong>${booking.booking_links.title}</strong> has been cancelled.`, 'secondary')}
    ${Spacer(24)}
    ${Card({
      variant: 'warning',
      content: `
        ${Heading({ text: 'Cancelled Booking Details', level: 3 })}
        ${Spacer(16)}
        ${InfoRow({ label: 'Date', value: formattedDate })}
        ${InfoRow({ label: 'Time', value: formattedTime })}
        ${InfoRow({ label: 'Reason', value: safeReason })}
      `
    })}
    ${Spacer(24)}
    ${Paragraph('Need to reschedule? Book a new time at any time.', 'muted')}
  `;

  const safeGuestName = sanitizeForEmail(booking.guest_name);

  try {
    await sendEmail({
      from: EMAIL_SENDERS.bookings,
      to: [booking.guest_email],
      subject: `Booking Cancelled - ${booking.booking_links.title}`,
      html: baseEmailTemplate({ content: guestContent }),
    });
    console.log("[cancel-booking] Guest cancellation email sent to:", booking.guest_email);
  } catch (emailErr) {
    console.error("[cancel-booking] Guest email send failed:", emailErr);
  }

  // Email to owner
  const ownerEmail = ownerProfile?.email;
  if (ownerEmail) {
    const ownerContent = `
      ${Heading({ text: 'Booking Cancellation Notice', level: 1 })}
      ${Spacer(8)}
      ${Paragraph(`${safeGuestName} has cancelled their booking.`, 'secondary')}
      ${Spacer(24)}
      ${Card({
        variant: 'warning',
        content: `
          ${InfoRow({ label: 'Guest', value: safeGuestName })}
          ${InfoRow({ label: 'Email', value: booking.guest_email })}
          ${InfoRow({ label: 'Date', value: formattedDate })}
          ${InfoRow({ label: 'Time', value: formattedTime })}
          ${InfoRow({ label: 'Reason', value: safeReason })}
        `
      })}
    `;

    try {
      await sendEmail({
        from: EMAIL_SENDERS.bookings,
        to: [ownerEmail],
        subject: `Booking Cancelled - ${booking.guest_name}`,
        html: baseEmailTemplate({ content: ownerContent }),
      });
      console.log("[cancel-booking] Owner cancellation email sent to:", ownerEmail);
    } catch (emailErr) {
      console.error("[cancel-booking] Owner email send failed:", emailErr);
    }
  } else {
    console.warn("[cancel-booking] No owner email found, skipping owner notification");
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
  );
}));
