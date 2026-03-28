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
  offerDeadline: isoDateSchema.optional(),
  strategistName: optionalNameSchema,
  offerId: z.string().optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { candidateEmail, candidateName, companyName, jobTitle, offerDeadline, strategistName, offerId } = parsed.data;

  const appUrl = getAppUrl();
  const dashboardUrl = offerId ? `${appUrl}/offers/${offerId}` : `${appUrl}/dashboard`;

  const deadlineText = offerDeadline
    ? new Date(offerDeadline).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const emailContent = `
    ${StatusBadge({ status: 'confirmed', text: 'OFFER RECEIVED' })}
    ${Heading({ text: 'You Have an Offer', level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Dear ${sanitizeForEmail(candidateName)},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`Congratulations. <strong>${sanitizeForEmail(companyName)}</strong> has extended an offer for the <strong>${sanitizeForEmail(jobTitle)}</strong> position.`, 'secondary')}
    ${Spacer(24)}
    ${Card({
      variant: 'highlight',
      content: `
        ${InfoRow({ icon: '🏢', label: 'Company', value: sanitizeForEmail(companyName) })}
        ${InfoRow({ icon: '💼', label: 'Role', value: sanitizeForEmail(jobTitle) })}
        ${deadlineText ? InfoRow({ icon: '⏰', label: 'Decision deadline', value: deadlineText }) : ''}
        ${strategistName ? InfoRow({ icon: '👤', label: 'Your strategist', value: sanitizeForEmail(strategistName) }) : ''}
      `,
    })}
    ${Spacer(24)}
    ${Card({
      variant: 'default',
      content: `
        ${Heading({ text: 'Recommended Next Steps', level: 3 })}
        ${Spacer(8)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong>1.</strong> Review the full offer details in your dashboard</td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong>2.</strong> Use the QUIN offer comparison tool for market context <span style="font-size: 11px; color: ${EMAIL_COLORS.textMuted};">Powered by QUIN</span></td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong>3.</strong> Contact your strategist with any questions</td></tr>
        </table>
      `,
    })}
    ${Spacer(32)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr><td align="center">
        ${Button({ url: dashboardUrl, text: 'View Offer Details', variant: 'primary' })}
      </td></tr>
    </table>
    ${Spacer(16)}
    ${Paragraph('This is a confidential communication. Please do not share the details of this offer.', 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: `${sanitizeForEmail(companyName)} has extended an offer for ${sanitizeForEmail(jobTitle)}`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.notifications,
    to: [candidateEmail],
    subject: `Offer Received — ${sanitizeForEmail(companyName)}`,
    html: htmlContent,
    headers: getEmailHeaders(),
  });

  console.log('[send-offer-notification-email] Sent:', result.id);

  return new Response(JSON.stringify({ success: true, emailId: result.id }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));
