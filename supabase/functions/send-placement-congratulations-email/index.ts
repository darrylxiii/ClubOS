import { createHandler } from '../_shared/handler.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, InfoRow, StatusBadge,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";
import { z, parseBody, emailSchema, nameSchema, optionalNameSchema, isoDateSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  candidateEmail: emailSchema,
  candidateName: nameSchema,
  companyName: nameSchema,
  jobTitle: z.string().min(1).max(300).trim(),
  startDate: isoDateSchema.optional(),
  strategistName: optionalNameSchema,
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { candidateEmail, candidateName, companyName, jobTitle, startDate, strategistName } = parsed.data;

  const appUrl = getAppUrl();
  const startDateText = startDate
    ? new Date(startDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const emailContent = `
    ${StatusBadge({ status: 'confirmed', text: 'CONGRATULATIONS' })}
    ${Heading({ text: 'Welcome to Your New Role', level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Dear ${sanitizeForEmail(candidateName)},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`We are delighted to confirm your placement as <strong>${sanitizeForEmail(jobTitle)}</strong> at <strong>${sanitizeForEmail(companyName)}</strong>. This is a significant achievement, and we are proud to have supported you through the process.`, 'secondary')}
    ${Spacer(24)}
    ${Card({
      variant: 'highlight',
      content: `
        ${InfoRow({ icon: '🏢', label: 'Company', value: sanitizeForEmail(companyName) })}
        ${InfoRow({ icon: '💼', label: 'Role', value: sanitizeForEmail(jobTitle) })}
        ${startDateText ? InfoRow({ icon: '📅', label: 'Start date', value: startDateText }) : ''}
        ${strategistName ? InfoRow({ icon: '👤', label: 'Your strategist', value: sanitizeForEmail(strategistName) }) : ''}
      `,
    })}
    ${Spacer(24)}
    ${Card({
      variant: 'default',
      content: `
        ${Heading({ text: 'Your Day-1 Checklist', level: 3 })}
        ${Spacer(8)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Confirm start date and onboarding schedule with HR</td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Complete any pre-employment documentation</td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Set up your work equipment and accounts</td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Review the company handbook or welcome pack</td></tr>
        </table>
      `,
    })}
    ${Spacer(32)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr><td align="center">
        ${Button({ url: `${appUrl}/dashboard`, text: 'Go to Dashboard', variant: 'primary' })}
      </td></tr>
    </table>
    ${Spacer(16)}
    ${Paragraph('Your strategist remains available if you need anything during your transition. We wish you every success.', 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: `Congratulations on your new role as ${sanitizeForEmail(jobTitle)} at ${sanitizeForEmail(companyName)}`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.notifications,
    to: [candidateEmail],
    subject: `Congratulations — Welcome to ${sanitizeForEmail(companyName)}`,
    html: htmlContent,
    headers: getEmailHeaders(),
  });
  console.log('[send-placement-congratulations-email] Sent:', result.id);

  return new Response(JSON.stringify({ success: true, emailId: result.id }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));
