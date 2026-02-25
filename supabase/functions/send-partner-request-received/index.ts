/**
 * Send Partner Request Received Email
 * Acknowledges that a partner application was received and sets expectations.
 */

import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, StatusBadge, InfoRow,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl, getEmailHeaders, htmlToPlainText } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PartnerRequestReceivedRequest {
  email: string;
  contactName: string;
  companyName?: string;
  requestId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('[send-partner-request-received] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PartnerRequestReceivedRequest = await req.json();
    const { email, contactName, companyName, requestId } = body;

    if (!email || !contactName) {
      return new Response(
        JSON.stringify({ error: 'email and contactName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-partner-request-received] Sending to ${email}`);

    const appUrl = getEmailAppUrl();

    const emailContent = `
      ${StatusBadge({ status: 'pending', text: 'REQUEST RECEIVED' })}
      ${Heading({ text: 'We Received Your Partner Request', level: 1, align: 'center' })}
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
      ${Paragraph('In the meantime, there is nothing you need to do. We will be in touch shortly.', 'secondary')}
      ${Spacer(16)}
      ${Paragraph(`Questions? Reach us at <a href="mailto:partners@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">partners@thequantumclub.nl</a>`, 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: 'Your partner request has been received. We will review it within 24 hours.',
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.partners,
        to: [email],
        subject: 'Partner Request Received — The Quantum Club',
        html: htmlContent,
        text: htmlToPlainText(htmlContent),
        headers: getEmailHeaders(),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[send-partner-request-received] Resend error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Email send failed: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await emailResponse.json();
    console.log('[send-partner-request-received] Sent successfully:', result.id);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-partner-request-received] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
