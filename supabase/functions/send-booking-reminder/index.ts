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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get bookings scheduled for tomorrow that haven't received reminders
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // FIX: Query bookings with booking_links separately, then fetch profile
    const { data: bookings, error: fetchError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        booking_links!inner(
          title,
          duration_minutes,
          user_id
        )
      `)
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("scheduled_start", tomorrow.toISOString())
      .lt("scheduled_start", dayAfterTomorrow.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch bookings: ${fetchError.message}`);
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No bookings to remind", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Reminders] Found ${bookings.length} bookings to send reminders for`);

    let successCount = 0;
    let errorCount = 0;

    // Send reminder emails
    for (const booking of bookings) {
      try {
        // FIX: Fetch the profile separately using the user_id from booking_links
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name, email")
          .eq("id", booking.booking_links.user_id)
          .single();

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

        const hostName = profile?.full_name || "The Quantum Club";

        const content = `
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: #FEF3C7; color: #92400E; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 24px;">
              REMINDER: MEETING TOMORROW
            </div>
          </div>

          <h1 class="text-primary" style="font-size: 28px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
            Your Meeting is Tomorrow
          </h1>

          <p class="text-secondary" style="font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
            This is a friendly reminder about your upcoming meeting with ${hostName}.
          </p>

          <div class="bg-card" style="padding: 24px; border-radius: 12px; margin-bottom: 32px;">
            <h3 class="text-primary" style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Meeting Details</h3>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 15px;">
              <tr>
                <td class="text-secondary" style="padding: 8px 0;"><strong>Meeting:</strong></td>
                <td class="text-primary" style="padding: 8px 0; text-align: right;">${booking.booking_links.title}</td>
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
                <td class="text-secondary" style="padding: 8px 0;"><strong>Duration:</strong></td>
                <td class="text-primary" style="padding: 8px 0; text-align: right;">${booking.booking_links.duration_minutes} minutes</td>
              </tr>
            </table>
          </div>

          ${booking.video_meeting_link ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${booking.video_meeting_link}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #C9A24E 0%, #F5F4EF 100%); color: #0E0E10; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Join Video Meeting
            </a>
          </div>
          ` : ''}

          <p class="text-secondary" style="font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
            Need to reschedule? <a href="https://app.thequantumclub.com/bookings/${booking.id}" style="color: #C9A24E; text-decoration: none;">Manage your booking</a>
          </p>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          },
          body: JSON.stringify({
            from: "The Quantum Club <bookings@thequantumclub.nl>",
            to: [booking.guest_email],
            subject: `Reminder: ${booking.booking_links.title} Tomorrow`,
            html: baseEmailTemplate({ 
              content,
              preheader: `Your meeting is tomorrow at ${formattedTime}`
            }),
          }),
        });

        // Mark reminder as sent
        await supabaseClient
          .from("bookings")
          .update({ reminder_sent: true })
          .eq("id", booking.id);

        successCount++;
        console.log(`[Reminders] Sent reminder for booking ${booking.id}`);
      } catch (error) {
        console.error(`[Reminders] Failed to send reminder for booking ${booking.id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: errorCount,
        total: bookings.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Reminders] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
