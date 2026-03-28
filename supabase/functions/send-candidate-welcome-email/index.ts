import { createHandler } from '../_shared/handler.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, InfoRow, StatusBadge,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";
import { z, parseBody, emailSchema, nameSchema, optionalNameSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  candidateEmail: emailSchema,
  candidateName: nameSchema,
  strategistName: optionalNameSchema,
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { candidateEmail, candidateName, strategistName } = parsed.data;

  const appUrl = getAppUrl();

  const emailContent = `
    ${StatusBadge({ status: 'confirmed', text: 'WELCOME' })}
    ${Heading({ text: 'Welcome to The Quantum Club', level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Dear ${sanitizeForEmail(candidateName)},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph('Your profile is now active. You have access to exclusive opportunities curated by our talent strategists, powered by QUIN — our AI matching engine.', 'secondary')}
    ${Spacer(24)}
    ${Card({
      variant: 'highlight',
      content: `
        ${Heading({ text: 'Getting Started', level: 3 })}
        ${Spacer(8)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong style="color: ${EMAIL_COLORS.textPrimary};">1.</strong> Complete your profile — the more detail, the better matches you'll receive</td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong style="color: ${EMAIL_COLORS.textPrimary};">2.</strong> Set your preferences — salary range, location, work style</td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong style="color: ${EMAIL_COLORS.textPrimary};">3.</strong> Review your privacy settings — you control what's shared</td></tr>
          <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong style="color: ${EMAIL_COLORS.textPrimary};">4.</strong> Connect your calendar for seamless interview scheduling</td></tr>
        </table>
      `,
    })}
    ${strategistName ? `
      ${Spacer(16)}
      ${Card({
        variant: 'default',
        content: `
          ${InfoRow({ icon: '👤', label: 'Your Strategist', value: sanitizeForEmail(strategistName) })}
          ${Spacer(8)}
          ${Paragraph('Your strategist is your primary point of contact. They will reach out within 24 hours to introduce themselves and discuss your career goals.', 'secondary')}
        `,
      })}
    ` : ''}
    ${Spacer(32)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr><td align="center">
        ${Button({ url: `${appUrl}/dashboard`, text: 'Open Your Dashboard', variant: 'primary' })}
      </td></tr>
    </table>
    ${Spacer(16)}
    ${Paragraph('We look forward to helping you find your next opportunity.', 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: 'Your profile is active. Explore exclusive opportunities on The Quantum Club.',
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.notifications,
    to: [candidateEmail],
    subject: 'Welcome to The Quantum Club',
    html: htmlContent,
    headers: getEmailHeaders(),
  });

  console.log('[send-candidate-welcome-email] Sent:', result.id);

  return new Response(JSON.stringify({ success: true, emailId: result.id }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));
