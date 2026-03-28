import { createHandler } from '../_shared/handler.ts';
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, InfoRow, StatusBadge,
  MeetingPrepCard, CalendarButtons,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";
import { z, parseBody, emailSchema, nameSchema, optionalNameSchema, isoDateSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const interviewSchema = z.object({
  candidateEmail: emailSchema,
  candidateName: nameSchema,
  companyName: z.string().max(300).optional().default(''),
  jobTitle: z.string().max(300).optional().default(''),
  interviewerName: optionalNameSchema,
  scheduledStart: isoDateSchema,
  scheduledEnd: isoDateSchema.optional(),
  meetingLink: z.string().url().optional(),
  interviewType: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, interviewSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { candidateEmail, candidateName, companyName, jobTitle, interviewerName, scheduledStart, scheduledEnd: scheduledEndRaw, meetingLink, interviewType, notes } = parsed.data;

  const safeCandidateName = sanitizeForEmail(candidateName);
  const safeCompanyName = sanitizeForEmail(companyName);
  const safeInterviewerName = sanitizeForEmail(interviewerName);
  const safeNotes = sanitizeForEmail(notes);

  const appUrl = getAppUrl();
  const startDate = new Date(scheduledStart);
  const endDate = new Date(scheduledEndRaw || new Date(startDate.getTime() + 60 * 60 * 1000).toISOString());

  const formattedDate = startDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = `${startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

  const interviewLabel = interviewType
    ? interviewType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Interview';

  const emailContent = `
    ${StatusBadge({ status: 'confirmed', text: 'INTERVIEW SCHEDULED' })}
    ${Heading({ text: `Your ${interviewLabel} is Confirmed`, level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Dear ${safeCandidateName},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`Your interview${safeCompanyName ? ` with <strong>${safeCompanyName}</strong>` : ''} has been scheduled. Here are the details:`, 'secondary')}
    ${Spacer(24)}
    ${Card({
      variant: 'highlight',
      content: `
        ${InfoRow({ icon: '📅', label: 'Date', value: formattedDate })}
        ${InfoRow({ icon: '🕐', label: 'Time', value: formattedTime })}
        ${jobTitle ? InfoRow({ icon: '💼', label: 'Role', value: sanitizeForEmail(jobTitle) }) : ''}
        ${safeInterviewerName ? InfoRow({ icon: '👤', label: 'Interviewer', value: safeInterviewerName }) : ''}
        ${interviewType ? InfoRow({ icon: '📋', label: 'Type', value: interviewLabel }) : ''}
      `,
    })}
    ${safeNotes ? `
      ${Spacer(16)}
      ${Card({
        variant: 'default',
        content: `
          ${Heading({ text: 'Additional Notes', level: 3 })}
          ${Paragraph(safeNotes, 'secondary')}
        `,
      })}
    ` : ''}
    ${meetingLink ? `
      ${Spacer(24)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr><td align="center">
          ${Button({ url: meetingLink, text: 'Join Meeting', variant: 'primary' })}
        </td></tr>
      </table>
    ` : ''}
    ${Spacer(24)}
    ${CalendarButtons({
      title: `${interviewLabel} — ${companyName || 'The Quantum Club'}`,
      startDate,
      endDate,
      description: `Interview for ${jobTitle || 'role'}${interviewerName ? ` with ${interviewerName}` : ''}`,
      location: meetingLink || '',
    })}
    ${Spacer(24)}
    ${MeetingPrepCard({
      meetingType: 'interview',
      companyName,
      interviewerName,
    })}
    ${Spacer(16)}
    ${Paragraph('Need to reschedule? Contact your strategist as soon as possible.', 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: `Your interview${safeCompanyName ? ` with ${safeCompanyName}` : ''} is confirmed for ${formattedDate}`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.bookings,
    to: [candidateEmail],
    subject: `Interview Confirmed — ${companyName || jobTitle || 'The Quantum Club'}`,
    html: htmlContent,
  });
  console.log('[send-interview-scheduled-email] Sent:', result.id);

  return new Response(JSON.stringify({ success: true, emailId: result.id }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));
