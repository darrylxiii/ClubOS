/**
 * Send Partner Declined Email
 * Partner-specific decline with business-oriented messaging (not career advice).
 */

import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, emailSchema, nameSchema, optionalNameSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  email: emailSchema,
  contactName: nameSchema,
  companyName: optionalNameSchema,
  declineReason: z.string().max(2000).optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { email, contactName, companyName, declineReason } = parsed.data;

  console.log(`[send-partner-declined-email] Sending to ${email}`);

  const emailContent = `
    ${Heading({ text: 'Partner Request Update', level: 1 })}
    ${Spacer(24)}
    ${Paragraph(`Dear ${sanitizeForEmail(contactName)},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`Thank you for your interest in partnering with The Quantum Club${companyName ? ` on behalf of <strong>${sanitizeForEmail(companyName)}</strong>` : ''}.`, 'secondary')}
    ${Spacer(8)}
    ${Paragraph('After careful review, we have determined that our services may not be the best fit for your current hiring needs at this time.', 'secondary')}
    ${declineReason ? `
      ${Spacer(24)}
      ${Card({
        variant: 'default',
        content: `
          ${Heading({ text: 'Our Assessment', level: 3 })}
          ${Spacer(8)}
          ${Paragraph(sanitizeForEmail(declineReason), 'secondary')}
        `,
      })}
    ` : ''}
    ${Spacer(24)}
    ${Paragraph('This does not preclude future collaboration. As your hiring needs evolve, we would love to hear from you again — your profile is saved, so reapplying takes seconds.', 'secondary')}
    ${Spacer(16)}
    ${Button({ url: `${getEmailAppUrl()}/partner`, text: 'Reapply when you\u2019re ready', variant: 'secondary' })}
    ${Spacer(24)}
    ${Paragraph('In the meantime, we publish quarterly hiring benchmarks and market insights. Keep an eye on your inbox for actionable intelligence from our team.', 'muted')}
    ${Spacer(16)}
    ${Paragraph(`Questions? Reach us at <a href="mailto:partners@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">partners@thequantumclub.nl</a>`, 'muted')}
    ${Spacer(24)}
    ${Paragraph('Best regards,<br><strong>The Quantum Club Team</strong>', 'secondary')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: 'An update on your partner request with The Quantum Club.',
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.partners,
    to: [email],
    subject: 'Update on Your Partner Request — The Quantum Club',
    html: htmlContent,
    headers: getEmailHeaders(),
  });

  console.log('[send-partner-declined-email] Sent successfully:', result.id);

  return new Response(
    JSON.stringify({ success: true, emailId: result.id }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
