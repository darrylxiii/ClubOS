/**
 * Send Partner Declined Email
 * Partner-specific decline with business-oriented messaging (not career advice).
 */

import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailHeaders, htmlToPlainText } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PartnerDeclinedRequest {
  email: string;
  contactName: string;
  companyName?: string;
  declineReason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PartnerDeclinedRequest = await req.json();
    const { email, contactName, companyName, declineReason } = body;

    if (!email || !contactName) {
      return new Response(
        JSON.stringify({ error: 'email and contactName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-partner-declined-email] Sending to ${email}`);

    const emailContent = `
      ${Heading({ text: 'Partner Request Update', level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Dear ${contactName},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(`Thank you for your interest in partnering with The Quantum Club${companyName ? ` on behalf of <strong>${companyName}</strong>` : ''}.`, 'secondary')}
      ${Spacer(8)}
      ${Paragraph('After careful review, we have determined that our services may not be the best fit for your current hiring needs at this time.', 'secondary')}
      ${declineReason ? `
        ${Spacer(24)}
        ${Card({
          variant: 'default',
          content: `
            ${Heading({ text: 'Our Assessment', level: 3 })}
            ${Spacer(8)}
            ${Paragraph(declineReason, 'secondary')}
          `,
        })}
      ` : ''}
      ${Spacer(24)}
      ${Paragraph('This does not preclude future collaboration. As your hiring needs evolve, we welcome you to reapply.', 'secondary')}
      ${Spacer(16)}
      ${Paragraph(`If you have questions about this decision, please contact us at <a href="mailto:partners@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">partners@thequantumclub.nl</a>`, 'muted')}
      ${Spacer(24)}
      ${Paragraph('Best regards,<br><strong>The Quantum Club Team</strong>', 'secondary')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: 'An update on your partner request with The Quantum Club.',
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
        subject: 'Update on Your Partner Request — The Quantum Club',
        html: htmlContent,
        text: htmlToPlainText(htmlContent),
        headers: getEmailHeaders(),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[send-partner-declined-email] Resend error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Email send failed: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await emailResponse.json();
    console.log('[send-partner-declined-email] Sent successfully:', result.id);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-partner-declined-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
