import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { 
  Heading, Paragraph, Spacer, Card, InfoRow, 
  VideoCallCard, StatusBadge, MeetingPrepCard, CalendarButtons 
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";

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

    const appUrl = getEmailAppUrl();

    // Get bookings scheduled for tomorrow that haven't received reminders
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Query bookings with booking_links and fetch meeting info
    const { data: bookings, error: fetchError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        booking_links!inner(
          title,
          duration_minutes,
          user_id,
          create_quantum_meeting,
          description
        ),
        meetings:meeting_id(
          id,
          meeting_code
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

    for (const booking of bookings) {
      try {
        // Fetch the profile separately
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name, email")
          .eq("id", booking.booking_links.user_id)
          .single();

        const startDate = new Date(booking.scheduled_start);
        const endDate = new Date(booking.scheduled_end);
        
        const formattedDate = startDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = startDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const formattedTimeRange = `${formattedTime} - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

        const hostName = profile?.full_name || "Your Host";

        // Determine video meeting link
        let meetingLink = null;
        let platformName = "Video Conference";
        let platformType: 'google_meet' | 'zoom' | 'club_meetings' | 'teams' | 'generic' = 'generic';
        
        if (booking.meetings?.meeting_code) {
          meetingLink = `${appUrl}/meeting/${booking.meetings.meeting_code}`;
          platformName = "Club Meetings";
          platformType = 'club_meetings';
        } else if (booking.quantum_meeting_link) {
          meetingLink = booking.quantum_meeting_link;
          platformName = "Club Meetings";
          platformType = 'club_meetings';
        } else if (booking.google_meet_hangout_link) {
          meetingLink = booking.google_meet_hangout_link;
          platformName = "Google Meet";
          platformType = 'google_meet';
        } else if (booking.video_meeting_link) {
          meetingLink = booking.video_meeting_link;
        }

        const content = `
          ${StatusBadge({ status: 'reminder', text: 'MEETING TOMORROW' })}
          ${Heading({ text: 'Your Meeting is Tomorrow', level: 1, align: 'center' })}
          ${Spacer(24)}
          ${Paragraph(`Hi ${booking.guest_name},`, 'primary')}
          ${Spacer(8)}
          ${Paragraph(`This is a friendly reminder about your upcoming meeting with <strong>${hostName}</strong>.`, 'secondary')}
          ${Spacer(32)}
          ${Card({
            variant: 'highlight',
            content: `
              ${Heading({ text: booking.booking_links.title, level: 2 })}
              ${Spacer(16)}
              ${InfoRow({ icon: '👤', label: 'Host', value: hostName })}
              ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
              ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedTimeRange} (${booking.timezone})` })}
              ${InfoRow({ icon: '⏱️', label: 'Duration', value: `${booking.booking_links.duration_minutes} minutes` })}
            `
          })}
          ${Spacer(24)}
          ${meetingLink ? VideoCallCard({
            platform: platformType,
            platformName: platformName,
            joinUrl: meetingLink,
            instructions: 'Click below to join when your meeting starts.',
          }) : ''}
          ${Spacer(24)}
          ${MeetingPrepCard({
            meetingType: booking.booking_links.title?.toLowerCase().includes('interview') ? 'interview' : 'general',
            interviewerName: hostName,
          })}
          ${Spacer(24)}
          ${CalendarButtons({
            title: booking.booking_links.title,
            startDate: startDate,
            endDate: endDate,
            description: booking.booking_links.description || '',
            location: meetingLink || '',
          })}
          ${Spacer(24)}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center">
                <p style="font-size: 14px; color: ${EMAIL_COLORS.textMuted}; margin: 0;">
                  Need to reschedule? <a href="${appUrl}/bookings/${booking.id}/manage" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Manage your booking</a>
                </p>
              </td>
            </tr>
          </table>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          },
          body: JSON.stringify({
            from: EMAIL_SENDERS.bookings,
            to: [booking.guest_email],
            subject: `🔔 Reminder: ${booking.booking_links.title} Tomorrow at ${formattedTime}`,
            html: baseEmailTemplate({ 
              content,
              preheader: `Your meeting with ${hostName} is tomorrow at ${formattedTime}`,
              showHeader: true,
              showFooter: true,
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
