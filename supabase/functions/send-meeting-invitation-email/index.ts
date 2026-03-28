import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, InfoRow,
  CalendarButtons, SchemaEvent
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, uuidSchema, emailSchema, nameSchema, isoDateSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const emailRequestSchema = z.object({
  invitationId: uuidSchema,
  inviteeEmail: emailSchema,
  inviterName: nameSchema,
  meetingTitle: z.string().min(1).max(500),
  meetingStartTime: isoDateSchema,
  meetingDuration: z.number().int().positive(),
  meetingUrl: z.string().url(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

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

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, emailRequestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const emailData = parsed.data;

  const safeInviterName = sanitizeForEmail(emailData.inviterName);
  const safeMeetingTitle = sanitizeForEmail(emailData.meetingTitle);

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
    ${Paragraph(`<strong style="color: ${EMAIL_COLORS.gold};">${safeInviterName}</strong> has invited you to:`, 'secondary')}
    ${Spacer(24)}

    ${Card({
      variant: 'highlight',
      content: `
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${EMAIL_COLORS.ivory};">
          ${safeMeetingTitle}
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
    preheader: `${safeInviterName} invited you to ${safeMeetingTitle} • ${formattedDate}`,
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
  await ctx.supabase
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
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  );
}));
