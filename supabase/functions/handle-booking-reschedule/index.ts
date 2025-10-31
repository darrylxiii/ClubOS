import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Update meeting if exists
    if (booking.meeting_id) {
      await supabaseClient
        .from("meetings")
        .update({
          start_time: newStart,
          end_time: newEnd,
        })
        .eq("id", booking.meeting_id);
    }

    // Send notification emails
    const hostName = booking.profiles?.full_name || "Your host";
    
    // Email to guest
    const guestEmailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Meeting Rescheduled</h2>
        
        <p>Hi ${booking.guest_name},</p>
        
        <p>Your meeting <strong>"${booking.booking_links?.title}"</strong> has been rescheduled.</p>
        
        ${reason ? `<p><em>Reason: ${reason}</em></p>` : ''}
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 8px 0;"><strong>Previous time:</strong> ${oldStart.toLocaleString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}</p>
          <p style="margin: 8px 0; color: #059669; font-weight: 600;"><strong>New time:</strong> ${newStartDate.toLocaleString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}</p>
          <p style="margin: 8px 0;"><strong>Duration:</strong> ${booking.booking_links?.duration_minutes} minutes</p>
        </div>
        
        <p>Please update your calendar accordingly. We look forward to meeting with you!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Powered by The Quantum Club
        </p>
      </div>
    `;

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
      const hostEmailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Booking Rescheduled</h2>
          
          <p>Hi ${hostName},</p>
          
          <p>A booking has been rescheduled:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Guest:</strong> ${booking.guest_name} (${booking.guest_email})</p>
            <p style="margin: 8px 0;"><strong>Meeting:</strong> ${booking.booking_links?.title}</p>
            <p style="margin: 8px 0;"><strong>New time:</strong> ${newStartDate.toLocaleString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}</p>
            ${reason ? `<p style="margin: 8px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
        </div>
      `;

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
