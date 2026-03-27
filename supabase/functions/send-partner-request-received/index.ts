/**
 * Send Partner Request Received Email
 * Acknowledges that a partner application was received and sets expectations.
 */

import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, StatusBadge, InfoRow, Button,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';

interface PartnerRequestReceivedRequest {
  email: string;
  contactName: string;
  companyName?: string;
  requestId?: string;
}

Deno.serve(createHandler(async (req, ctx) => {
  const body: PartnerRequestReceivedRequest = await req.json();
  const { email, contactName, companyName, requestId } = body;

  if (!email || !contactName) {
    return new Response(
      JSON.stringify({ error: 'email and contactName are required' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[send-partner-request-received] Sending to ${email}`);

  const appUrl = getEmailAppUrl();

  const emailContent = `
    ${StatusBadge({ status: 'pending', text: 'BRIEF RECEIVED' })}
    ${Heading({ text: 'Your Brief Has Been Received', level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Dear ${contactName},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`Thank you for your interest in partnering with The Quantum Club${companyName ? ` on behalf of <strong>${companyName}</strong>` : ''}. Your request has been received and is now under review.`, 'secondary')}
    ${Spacer(24)}
    ${Card({
      variant: 'highlight',
      content: `
        ${Heading({ text: 'What happens next', level: 3 })}
        ${Spacer(12)}
        ${InfoRow({ icon: '1️⃣', label: 'Review', value: 'Our team reviews your request (typically within 24 hours)' })}
        ${InfoRow({ icon: '2️⃣', label: 'Decision', value: 'You will receive an email with the outcome' })}
        ${InfoRow({ icon: '3️⃣', label: 'Onboarding', value: 'If approved, you will receive a direct login link and meet your strategist' })}
      `,
    })}
    ${Spacer(32)}
    ${Paragraph('While you wait — want to get a head start?', 'secondary')}
    ${Spacer(16)}
    ${Button({ url: `${appUrl}/book/darryl`, text: 'Book a 15-minute strategy call', variant: 'primary' })}
    ${Spacer(24)}
    ${Paragraph('No preparation needed. Your strategist will walk you through next steps and answer any questions.', 'muted')}
    ${Spacer(16)}
    ${Paragraph(`Or reach us directly at <a href="mailto:partners@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">partners@thequantumclub.nl</a>`, 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: 'Your brief has been received. We will review it within 24 hours.',
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.partners,
    to: [email],
    subject: 'Partner Request Received — The Quantum Club',
    html: htmlContent,
  });

  console.log('[send-partner-request-received] Sent successfully:', result.id);

  return new Response(
    JSON.stringify({ success: true, emailId: result.id }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
