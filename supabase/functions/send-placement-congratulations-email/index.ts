import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";
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

interface PlacementRequest {
  candidateEmail: string;
  candidateName: string;
  companyName: string;
  jobTitle: string;
  startDate?: string;
  strategistName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PlacementRequest = await req.json();
    const { candidateEmail, candidateName, companyName, jobTitle, startDate, strategistName } = body;

    if (!candidateEmail || !candidateName || !companyName) {
      throw new Error('Missing required fields');
    }

    const appUrl = getAppUrl();
    const startDateText = startDate
      ? new Date(startDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    const emailContent = `
      ${StatusBadge({ status: 'confirmed', text: 'CONGRATULATIONS' })}
      ${Heading({ text: 'Welcome to Your New Role', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Dear ${candidateName},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(`We are delighted to confirm your placement as <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. This is a significant achievement, and we are proud to have supported you through the process.`, 'secondary')}
      ${Spacer(24)}
      ${Card({
        variant: 'highlight',
        content: `
          ${InfoRow({ icon: '🏢', label: 'Company', value: companyName })}
          ${InfoRow({ icon: '💼', label: 'Role', value: jobTitle })}
          ${startDateText ? InfoRow({ icon: '📅', label: 'Start date', value: startDateText }) : ''}
          ${strategistName ? InfoRow({ icon: '👤', label: 'Your strategist', value: strategistName }) : ''}
        `,
      })}
      ${Spacer(24)}
      ${Card({
        variant: 'default',
        content: `
          ${Heading({ text: 'Your Day-1 Checklist', level: 3 })}
          ${Spacer(8)}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Confirm start date and onboarding schedule with HR</td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Complete any pre-employment documentation</td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Set up your work equipment and accounts</td></tr>
            <tr><td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.8; padding: 4px 0;">☐ Review the company handbook or welcome pack</td></tr>
          </table>
        `,
      })}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr><td align="center">
          ${Button({ url: `${appUrl}/dashboard`, text: 'Go to Dashboard', variant: 'primary' })}
        </td></tr>
      </table>
      ${Spacer(16)}
      ${Paragraph('Your strategist remains available if you need anything during your transition. We wish you every success.', 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `Congratulations on your new role as ${jobTitle} at ${companyName}`,
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
        subject: `Congratulations — Welcome to ${companyName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const result = await res.json();
    console.log('[send-placement-congratulations-email] Sent:', result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[send-placement-congratulations-email] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
