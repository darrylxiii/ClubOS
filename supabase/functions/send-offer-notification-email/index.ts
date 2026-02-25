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

interface OfferNotificationRequest {
  candidateEmail: string;
  candidateName: string;
  companyName: string;
  jobTitle: string;
  offerDeadline?: string; // ISO date
  strategistName?: string;
  offerId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: OfferNotificationRequest = await req.json();
    const { candidateEmail, candidateName, companyName, jobTitle, offerDeadline, strategistName, offerId } = body;

    if (!candidateEmail || !candidateName || !companyName) {
      throw new Error('Missing required fields');
    }

    const appUrl = getAppUrl();
    const dashboardUrl = offerId ? `${appUrl}/offers/${offerId}` : `${appUrl}/dashboard`;

    const deadlineText = offerDeadline
      ? new Date(offerDeadline).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    const emailContent = `
      ${StatusBadge({ status: 'confirmed', text: 'OFFER RECEIVED' })}
      ${Heading({ text: 'You Have an Offer', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Dear ${candidateName},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(`Congratulations. <strong>${companyName}</strong> has extended an offer for the <strong>${jobTitle}</strong> position.`, 'secondary')}
      ${Spacer(24)}
      ${Card({
        variant: 'highlight',
        content: `
          ${InfoRow({ icon: '🏢', label: 'Company', value: companyName })}
          ${InfoRow({ icon: '💼', label: 'Role', value: jobTitle })}
          ${deadlineText ? InfoRow({ icon: '⏰', label: 'Decision deadline', value: deadlineText }) : ''}
          ${strategistName ? InfoRow({ icon: '👤', label: 'Your strategist', value: strategistName }) : ''}
        `,
      })}
      ${Spacer(24)}
      ${Card({
        variant: 'default',
        content: `
          ${Heading({ text: 'Recommended Next Steps', level: 3 })}
          ${Spacer(8)}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong>1.</strong> Review the full offer details in your dashboard</td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong>2.</strong> Use the QUIN offer comparison tool for market context <span style="font-size: 11px; color: ${EMAIL_COLORS.textMuted};">Powered by QUIN</span></td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;"><strong>3.</strong> Contact your strategist with any questions</td></tr>
          </table>
        `,
      })}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr><td align="center">
          ${Button({ url: dashboardUrl, text: 'View Offer Details', variant: 'primary' })}
        </td></tr>
      </table>
      ${Spacer(16)}
      ${Paragraph('This is a confidential communication. Please do not share the details of this offer.', 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `${companyName} has extended an offer for ${jobTitle}`,
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
        subject: `Offer Received — ${companyName}`,
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
    console.log('[send-offer-notification-email] Sent:', result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[send-offer-notification-email] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
