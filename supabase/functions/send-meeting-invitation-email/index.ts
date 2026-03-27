import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { 
  Heading, Paragraph, Spacer, Card, Button, InfoRow, 
  CalendarButtons, SchemaEvent 
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  invitationId: string;
  inviteeEmail: string;
  inviterName: string;
  meetingTitle: string;
  meetingStartTime: string;
  meetingDuration: number;
  meetingUrl: string;
}

const generateICS = (
  title: string,
  startTime: string,
  duration: number,
  url: string
): string => {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60000);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//The Quantum Club//Meeting Invitation//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${crypto.randomUUID()}@thequantumclub.nl
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${title}
DESCRIPTION:Join the meeting at: ${url}
URL:${url}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const emailData: EmailRequest = await req.json();
    
    // Use APP_URL from env or fallback to production URL
    const appUrl = getEmailAppUrl();
    const acceptUrl = `${appUrl}/api/meeting-response?id=${emailData.invitationId}&action=accept`;
    const declineUrl = `${appUrl}/api/meeting-response?id=${emailData.invitationId}&action=decline`;

    // Format dates
    const start = new Date(emailData.meetingStartTime);
    const end = new Date(start.getTime() + emailData.meetingDuration * 60000);
    const formattedDate = start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const icsContent = generateICS(
      emailData.meetingTitle,
      emailData.meetingStartTime,
      emailData.meetingDuration,
      emailData.meetingUrl
    );

    // Build email content using components
    const emailContent = `
      ${SchemaEvent({
        name: emailData.meetingTitle,
        startDate: emailData.meetingStartTime,
        endDate: end.toISOString(),
        location: emailData.meetingUrl,
        description: `Meeting with ${emailData.inviterName}`,
        organizerName: emailData.inviterName,
      })}
      
      ${Heading({ text: 'Meeting Invitation', level: 1 })}
      ${Spacer(16)}
      ${Paragraph(`<strong style="color: ${EMAIL_COLORS.gold};">${emailData.inviterName}</strong> has invited you to:`, 'secondary')}
      ${Spacer(24)}
      
      ${Card({
        variant: 'highlight',
        content: `
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${EMAIL_COLORS.ivory};">
            ${emailData.meetingTitle}
          </h2>
          ${InfoRow({ icon: '📅', label: 'When', value: formattedDate })}
          ${InfoRow({ icon: '🕐', label: 'Time', value: formattedTime })}
          ${InfoRow({ icon: '⏱️', label: 'Duration', value: `${emailData.meetingDuration} minutes` })}
        `
      })}
      
      ${Spacer(32)}
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding-bottom: 12px;">
            ${Button({ url: acceptUrl, text: '✓ Accept & Join Meeting', variant: 'primary' })}
          </td>
        </tr>
        <tr>
          <td align="center">
            ${Button({ url: declineUrl, text: 'Decline', variant: 'secondary' })}
          </td>
        </tr>
      </table>
      
      ${Spacer(24)}
      ${CalendarButtons({
        title: emailData.meetingTitle,
        startDate: start,
        endDate: end,
        location: emailData.meetingUrl,
        description: `Meeting with ${emailData.inviterName}`,
      })}
      
      ${Spacer(24)}
      ${Paragraph(`Can't make it? <a href="${declineUrl}" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Let us know</a>`, 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `${emailData.inviterName} invited you to ${emailData.meetingTitle} • ${formattedDate}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send the email via shared Resend client
    console.log('[send-meeting-invitation-email] Sending email via Resend to:', emailData.inviteeEmail);

    const emailResult = await sendEmail({
      from: EMAIL_SENDERS.meetings,
      to: [emailData.inviteeEmail],
      subject: `Meeting Invitation: ${emailData.meetingTitle}`,
      html: htmlContent,
      attachments: [
        {
          filename: 'meeting.ics',
          content: btoa(icsContent),
          type: 'text/calendar',
        }
      ],
    });

    console.log('[send-meeting-invitation-email] Email sent successfully:', emailResult.id);

    // Update notification queue status
    await supabase
      .from('meeting_notification_queue')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('meeting_invitation_id', emailData.invitationId)
      .eq('notification_type', 'email');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        icsAttachment: btoa(icsContent)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[send-meeting-invitation-email] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
