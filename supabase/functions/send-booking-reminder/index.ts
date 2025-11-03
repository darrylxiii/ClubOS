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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const reminderWindows = [
      { type: '24h', hours: 24, name: '24 hours' },
      { type: '1h', hours: 1, name: '1 hour' },
      { type: '15min', hours: 0.25, name: '15 minutes' }
    ];

    console.log(`[Reminders] Checking for upcoming bookings at ${now.toISOString()}`);

    for (const window of reminderWindows) {
      const targetTime = new Date(now.getTime() + window.hours * 60 * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 5 * 60 * 1000); // 5 min before
      const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000); // 5 min after

      // Get bookings that need reminders
      const { data: bookings, error: bookingsError } = await supabaseClient
        .from("bookings")
        .select(`
          id,
          user_id,
          guest_name,
          guest_email,
          scheduled_start,
          scheduled_end,
          booking_links (
            title,
            meeting_link,
            duration_minutes
          )
        `)
        .eq("status", "confirmed")
        .gte("scheduled_start", windowStart.toISOString())
        .lte("scheduled_start", windowEnd.toISOString());

      if (bookingsError) {
        console.error(`[Reminders] Error fetching bookings for ${window.type}:`, bookingsError);
        continue;
      }

      console.log(`[Reminders] Found ${bookings?.length || 0} bookings for ${window.type} window`);

      for (const booking of bookings || []) {
        // Check if reminder already sent
        const { data: existingReminder } = await supabaseClient
          .from("booking_reminders")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("reminder_type", window.type)
          .maybeSingle();

        if (existingReminder) {
          console.log(`[Reminders] Already sent ${window.type} reminder for booking ${booking.id}`);
          continue;
        }

        // Send reminder email
        try {
          const startTime = new Date(booking.scheduled_start);
          const bookingLinkData = Array.isArray(booking.booking_links) ? booking.booking_links[0] : booking.booking_links;
          
          // Fetch host profile separately
          const { data: hostProfile } = await supabaseClient
            .from("profiles")
            .select("full_name")
            .eq("id", booking.user_id)
            .maybeSingle();
          
          const hostName = hostProfile?.full_name || "Your host";
          
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">Meeting Reminder</h2>
              
              <p>Hi ${booking.guest_name},</p>
              
              <p>This is a reminder that your meeting <strong>"${bookingLinkData?.title}"</strong> with ${hostName} is starting in <strong>${window.name}</strong>.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 8px 0;"><strong>📅 When:</strong> ${startTime.toLocaleString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}</p>
                <p style="margin: 8px 0;"><strong>⏱️ Duration:</strong> ${bookingLinkData?.duration_minutes} minutes</p>
                ${bookingLinkData?.meeting_link ? `
                  <p style="margin: 16px 0;">
                    <a href="${bookingLinkData.meeting_link}" 
                       style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                      Join Meeting
                    </a>
                  </p>
                ` : ''}
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If you need to reschedule or cancel, please contact ${hostName} directly.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                Powered by The Quantum Club
              </p>
            </div>
          `;

          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "The Quantum Club <bookings@thequantumclub.com>",
              to: [booking.guest_email],
              subject: `Reminder: ${bookingLinkData?.title} in ${window.name}`,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            throw new Error(`Email API error: ${await emailResponse.text()}`);
          }

          console.log(`[Reminders] Sent ${window.type} reminder to ${booking.guest_email}`);

          // Log reminder sent
          await supabaseClient
            .from("booking_reminders")
            .insert({
              booking_id: booking.id,
              reminder_type: window.type,
              sent_at: now.toISOString(),
            });

        } catch (emailError: any) {
          console.error(`[Reminders] Error sending reminder for booking ${booking.id}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: now.toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Reminders] Error processing reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
