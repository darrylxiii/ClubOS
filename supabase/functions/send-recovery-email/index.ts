import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, InfoRow } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, emailSchema } from '../_shared/validation.ts';

const requestSchema = z.object({
  email: emailSchema,
  sessionId: z.string().min(1, 'sessionId is required'),
  step: z.number().optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { email, sessionId, step } = parsed.data;

  const appUrl = getEmailAppUrl();
  const recoveryLink = `${appUrl}/partner?recover=${sessionId}`;

  console.log(`[send-recovery-email] Sending link to ${email} for session ${sessionId} at step ${step}`);

  // Store recovery request for audit
  await ctx.supabase.from('funnel_analytics').insert({
    session_id: sessionId,
    step_number: step,
    step_name: 'recovery_email_sent',
    action: 'email_sent',
    metadata: {
      email_to: email,
      recovery_link: recoveryLink,
      sent_at: new Date().toISOString(),
    },
  });

  // Send email via shared Resend client
  const emailContent = `
    ${Heading({ text: 'Continue Your Application', level: 1 })}
    ${Spacer(16)}
    ${Paragraph('You started a partner application on The Quantum Club. Use the link below to pick up where you left off.', 'secondary')}
    ${Spacer(16)}
    ${Card({
      variant: 'highlight',
      content: `
        ${InfoRow({ icon: '📋', label: 'Session', value: sessionId.substring(0, 8) + '...' })}
        ${step ? InfoRow({ icon: '📍', label: 'Progress', value: `Step ${step}` }) : ''}
      `,
    })}
    ${Spacer(24)}
    ${Button({ url: recoveryLink, text: 'Resume Application', variant: 'primary' })}
    ${Spacer(16)}
    ${Paragraph('This link will restore your progress. If you did not start this application, you can safely ignore this email.', 'muted')}
  `;

  const emailHtml = baseEmailTemplate({
    preheader: 'Pick up where you left off on your partner application',
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.partners,
    to: [email],
    subject: 'Resume Your Application — The Quantum Club',
    html: emailHtml,
    headers: getEmailHeaders(),
  });

  console.log('[send-recovery-email] Email sent:', result.id);

  return new Response(
    JSON.stringify({ success: true, message: 'Recovery email sent', emailId: result.id }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
