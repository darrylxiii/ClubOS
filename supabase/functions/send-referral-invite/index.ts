import { createHandler } from '../_shared/handler.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Card, Heading, Paragraph, Spacer, InfoRow, StatusBadge } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, emailSchema, nameSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  inviteCode: z.string().min(1).max(50),
  friendEmail: emailSchema,
  friendName: nameSchema,
  jobTitle: z.string().min(1).max(300).trim(),
  companyName: nameSchema,
  referrerName: nameSchema,
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { inviteCode, friendEmail, friendName, jobTitle, companyName, referrerName } = parsed.data;

  const appUrl = getEmailAppUrl();
  const inviteLink = `${appUrl}/auth?invite=${inviteCode}`;

  const emailContent = `
    ${StatusBadge({ status: 'new', text: 'YOU\'VE BEEN REFERRED' })}
    ${Heading({ text: `${sanitizeForEmail(referrerName)} thinks you would be a great fit for this role`, level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Hi ${sanitizeForEmail(friendName)},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`<strong>${sanitizeForEmail(referrerName)}</strong> believes you'd be a great fit for an exciting opportunity at <strong>${sanitizeForEmail(companyName)}</strong>.`, 'secondary')}
    ${Spacer(32)}
    ${Card({
      variant: 'highlight',
      content: `
        ${Heading({ text: sanitizeForEmail(jobTitle), level: 2 })}
        ${Spacer(16)}
        ${InfoRow({ icon: '🏢', label: 'Company', value: sanitizeForEmail(companyName) })}
        ${InfoRow({ icon: '👤', label: 'Referred by', value: sanitizeForEmail(referrerName) })}
        ${Spacer(16)}
        ${Paragraph('Your friend has already filled in some of your professional details to help speed up your application. You\'ll be able to review and edit everything during signup.', 'secondary')}
      `
    })}
    ${Spacer(32)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({ url: inviteLink, text: 'Get Started →', variant: 'primary' })}
        </td>
      </tr>
    </table>
    ${Spacer(32)}
    ${Paragraph('This invite link expires in 30 days. Your information is kept secure and you can edit or delete it at any time.', 'muted')}
    ${Spacer(16)}
    ${Paragraph('If you didn\'t expect this email, you can safely ignore it.', 'muted')}
  `;

  const html = baseEmailTemplate({
    preheader: `${sanitizeForEmail(referrerName)} referred you to ${sanitizeForEmail(jobTitle)} at ${sanitizeForEmail(companyName)}`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.referrals,
    to: [friendEmail],
    subject: `${sanitizeForEmail(referrerName)} thinks you would be a great fit for ${sanitizeForEmail(jobTitle)} at ${sanitizeForEmail(companyName)}`,
    html,
    headers: getEmailHeaders(),
  });

  console.log("[send-referral-invite] Referral email sent successfully:", result);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...ctx.corsHeaders,
    },
  });
}));
