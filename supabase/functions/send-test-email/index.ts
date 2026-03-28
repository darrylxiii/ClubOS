import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, emailSchema } from '../_shared/validation.ts';

const requestSchema = z.object({
  templateKey: z.string().min(1).max(200).trim(),
  testEmail: emailSchema,
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { templateKey, testEmail } = parsed.data;

  console.log('[send-test-email] Sending test for:', { templateKey, testEmail });

  // Fetch template from database
  const { data: template, error: templateError } = await ctx.supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single();

  if (templateError || !template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  // Generate sample data for variables
  const sampleData: Record<string, string> = {
    fullName: 'John Doe',
    email: testEmail,
    requestType: 'candidate',
    declineReason: 'Sample decline reason for testing',
    guestName: 'John Doe',
    scheduledStart: new Date().toLocaleString(),
    meetingLink: 'https://meet.example.com/test-meeting',
  };

  // Build email content using template components
  const contentData = template.content_template;
  const steps = contentData.candidateNextSteps || contentData.partnerNextSteps || [];
  const stepsHtml = steps.length > 0
    ? `<ul style="margin: 10px 0 0 0; padding-left: 20px;">${steps.map((step: string) => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}</ul>`
    : '';

  const emailContent = `
    ${AlertBox({
      type: 'warning',
      title: '🧪 Test Email',
      message: `This is a test of the "${template.name}" template`,
    })}
    ${Spacer(24)}
    ${Heading({ text: contentData.heading || template.name, level: 1 })}
    ${Spacer(16)}
    ${Paragraph(`Dear ${sampleData.fullName},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(contentData.intro || 'Email content goes here', 'secondary')}
    ${stepsHtml ? `
      ${Spacer(24)}
      ${Card({
        variant: 'highlight',
        content: `
          <p style="margin: 0 0 8px 0;"><strong>What's Next:</strong></p>
          ${stepsHtml}
        `
      })}
    ` : ''}
    ${contentData.showReason ? `
      ${Spacer(16)}
      ${Paragraph(`<strong>Reason:</strong> ${sampleData.declineReason}`, 'muted')}
    ` : ''}
    ${Spacer(32)}
    ${Paragraph('Best regards,<br>The Quantum Club Team', 'secondary')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: `[TEST] ${template.subject_template}`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  // Send via shared Resend client
  const emailData = await sendEmail({
    from: EMAIL_SENDERS.system,
    to: [testEmail],
    subject: `[TEST] ${template.subject_template}`,
    html: htmlContent,
  });

  console.log('[send-test-email] Sent successfully:', emailData);

  return new Response(
    JSON.stringify({ success: true, messageId: emailData.id }),
    {
      status: 200,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    }
  );
}));
