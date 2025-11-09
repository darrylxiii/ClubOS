import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer, InfoRow } from "../_shared/email-templates/components.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, bookingLink, booking } = await req.json();

    const startDate = new Date(booking.scheduled_start);
    const now = new Date();
    const hoursUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    const minutesUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60));

    let reminderType = "";
    if (hoursUntil >= 20) {
      reminderType = "Your meeting is tomorrow";
    } else if (hoursUntil >= 1) {
      reminderType = `Your meeting is in ${hoursUntil} hours`;
    } else {
      reminderType = `Your meeting is in ${minutesUntil} minutes`;
    }

    const formattedDate = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const formattedTime = startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const meetingLink = booking.quantum_meeting_link || 
                       booking.video_meeting_link || 
                       bookingLink.meeting_link;

    const emailContent = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding-bottom: 32px;">
            <div style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%); border-radius: 100px; border: 1px solid rgba(239, 68, 68, 0.3);">
              <span style="color: #EF4444; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">⏰ MEETING REMINDER</span>
            </div>
          </td>
        </tr>
      </table>
      ${Heading({ text: reminderType, level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${name},`, 'primary')}
      ${Spacer(16)}
      ${Paragraph(`This is a friendly reminder about your upcoming meeting: <strong>${bookingLink.title}</strong>`, 'secondary')}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(201, 162, 78, 0.05) 0%, rgba(201, 162, 78, 0.02) 100%); border-radius: 16px; padding: 24px; border: 1px solid rgba(201, 162, 78, 0.15);">
        <tr>
          <td>
            ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
            ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedTime} (${booking.timezone})` })}
            ${meetingLink ? InfoRow({ icon: '🎥', label: 'Meeting Link', value: 'Click button below to join' }) : ''}
          </td>
        </tr>
      </table>
      ${Spacer(32)}
      ${meetingLink ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: meetingLink, text: '🚀 Join Meeting Now', variant: 'primary' })}
          </td>
        </tr>
      </table>
      ${Spacer(32)}
      ` : ''}
      ${Paragraph('See you soon!', 'muted')}
    `;

    const emailHtml = baseEmailTemplate({
      preheader: `${reminderType} - ${bookingLink.title}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Quantum Club <bookings@thequantumclub.nl>",
        to: [email],
        subject: `Reminder: ${bookingLink.title} - ${reminderType}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();
    console.log("Reminder email sent:", result);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending reminder email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
