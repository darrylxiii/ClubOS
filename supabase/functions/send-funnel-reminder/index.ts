import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer, Card, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, emailSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  email: emailSchema,
  contactName: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
  resumeUrl: z.string().url(),
  isSecondReminder: z.boolean().optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { email, contactName, companyName, resumeUrl, isSecondReminder } = parsed.data;

  const name = contactName ? sanitizeForEmail(contactName) : 'there';
  const company = companyName ? ` for ${sanitizeForEmail(companyName)}` : '';

  const subject = isSecondReminder
    ? `Your saved progress expires soon, ${name}`
    : `Your brief is saved, ${name}`;

  const headingText = isSecondReminder
    ? 'Your progress is expiring'
    : 'Your brief is saved';

  const bodyText = isSecondReminder
    ? `Your saved progress will be removed soon. Complete your hiring brief${company} now — it takes less than two minutes.`
    : `You began a hiring brief${company}. Your progress is saved — it takes less than two minutes to complete.`;

  const ctaText = isSecondReminder ? 'Complete Now' : 'Resume your brief';

  const preheader = isSecondReminder
    ? `Your hiring brief${company} expires soon — complete it in under 2 minutes.`
    : `Your hiring brief${company} is saved and ready to finish.`;

  const emailContent = `
    ${Heading({ text: headingText, level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Hi ${name},`, 'primary')}
    ${Paragraph(bodyText, 'secondary')}
    ${isSecondReminder ? AlertBox({ type: 'warning', title: 'Progress expiring soon', message: 'Your saved brief will be removed shortly. Complete it now to avoid starting over.' }) : ''}
    ${Spacer(24)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr><td align="center">
        ${Button({ url: resumeUrl, text: ctaText, variant: 'primary' })}
      </td></tr>
    </table>
    ${Spacer(32)}
    ${Card({ content: Paragraph('No fees until you hire. You only pay when you find the right candidate through our network.', 'secondary'), variant: 'highlight' })}
  `;

  const html = baseEmailTemplate({
    preheader,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.partners,
    to: [email],
    subject,
    html,
    headers: getEmailHeaders(),
  });

  return new Response(JSON.stringify({ success: true, id: result.id }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
  });
}));
