import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Card, Heading, Paragraph, Spacer, InfoRow } from "../_shared/email-templates/components.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking, bookingLink } = await req.json();

    const startDate = new Date(booking.scheduled_start);
    const endDate = new Date(booking.scheduled_end);
    
    const formattedDate = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const formattedTime = `${startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${endDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const confirmationMessage = bookingLink.confirmation_message || 
      `Your meeting has been scheduled for ${formattedDate} at ${formattedTime}.`;

    // Generate .ics calendar file content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Quantum Club//Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `UID:${booking.id}@quantumclub.com`,
      `SUMMARY:${bookingLink.title}`,
      `DESCRIPTION:${bookingLink.description || 'Meeting scheduled via Quantum Club'}`,
      `ORGANIZER;CN=Quantum Club:MAILTO:no-reply@quantumclub.com`,
      `ATTENDEE;CN=${booking.guest_name};RSVP=TRUE:MAILTO:${booking.guest_email}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Generate Add to Calendar URLs
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(bookingLink.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(bookingLink.description || '')}`;
    const outlookCalUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(bookingLink.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(bookingLink.description || '')}`;

    const emailContent = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding-bottom: 32px;">
            <div style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, rgba(201, 162, 78, 0.1) 0%, rgba(201, 162, 78, 0.05) 100%); border-radius: 100px; border: 1px solid rgba(201, 162, 78, 0.3);">
              <span style="color: #C9A24E; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">✓ BOOKING CONFIRMED</span>
            </div>
          </td>
        </tr>
      </table>
      ${Heading({ text: bookingLink.title, level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${booking.guest_name},`, 'primary')}
      ${Spacer(16)}
      ${Paragraph(confirmationMessage, 'secondary')}
      ${Spacer(32)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: 'Meeting Details', level: 2 })}
          ${Spacer(16)}
          ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
          ${InfoRow({ icon: '🕐', label: 'Time', value: `${formattedTime} (${booking.timezone})` })}
          ${bookingLink.description ? InfoRow({ icon: '📝', label: 'Description', value: bookingLink.description }) : ''}
          ${booking.notes ? InfoRow({ icon: '💬', label: 'Your Notes', value: booking.notes }) : ''}
        `
      })}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(201, 162, 78, 0.05) 0%, rgba(201, 162, 78, 0.02) 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(201, 162, 78, 0.15);">
        <tr>
          <td align="center">
            <p class="text-primary" style="margin: 0 0 24px 0; font-size: 18px; font-weight: 600;">
              📅 Add to Your Calendar
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center">
                  ${Button({ url: googleCalUrl, text: 'Google Calendar', variant: 'primary' })}
                </td>
              </tr>
              <tr><td style="height: 16px;"></td></tr>
              <tr>
                <td align="center">
                  ${Button({ url: outlookCalUrl, text: 'Outlook Calendar', variant: 'secondary' })}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: rgba(201, 162, 78, 0.05); border-left: 4px solid #C9A24E; border-radius: 8px; padding: 20px;">
        <tr>
          <td>
            <p class="text-secondary" style="margin: 0; font-size: 14px; line-height: 20px;">
              <strong>Need to make changes?</strong><br>
              If you need to cancel or reschedule, please contact us as soon as possible at 
              <a href="mailto:support@thequantumclub.nl" style="color: #C9A24E; text-decoration: none;">support@thequantumclub.nl</a>
            </p>
          </td>
        </tr>
      </table>
    `;

    const emailHtml = baseEmailTemplate({
      preheader: `Meeting confirmed for ${formattedDate} at ${formattedTime}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Quantum Club <onboarding@resend.dev>",
        to: [booking.guest_email],
        subject: `Meeting Confirmed: ${bookingLink.title}`,
        html: emailHtml,
        attachments: [
          {
            filename: "meeting.ics",
            content: btoa(icsContent),
            content_type: "text/calendar; method=REQUEST",
          },
        ],
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Confirmation email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});