import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailHeaders, htmlToPlainText } from "../_shared/email-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, InfoRow, StatusBadge,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CandidateWelcomeRequest {
  candidateEmail: string;
  candidateName: string;
  strategistName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CandidateWelcomeRequest = await req.json();
    const { candidateEmail, candidateName, strategistName } = body;

    if (!candidateEmail || !candidateName) {
      throw new Error('Missing required fields');
    }

    const appUrl = getAppUrl();

    const emailContent = `
      ${StatusBadge({ status: 'confirmed', text: 'WELCOME' })}
      ${Heading({ text: 'Welcome to The Quantum Club', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Dear ${candidateName},`, 'primary')}
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
            ${InfoRow({ icon: '👤', label: 'Your Strategist', value: strategistName })}
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

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_SENDERS.notifications,
        to: [candidateEmail],
        subject: 'Welcome to The Quantum Club',
        html: htmlContent,
        text: htmlToPlainText(htmlContent),
        headers: getEmailHeaders(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const result = await res.json();
    console.log('[send-candidate-welcome-email] Sent:', result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[send-candidate-welcome-email] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
