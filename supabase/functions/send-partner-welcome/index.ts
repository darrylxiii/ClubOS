import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from '../_shared/email-config.ts';
import { baseEmailTemplate } from '../_shared/email-templates/base-template.ts';
import { Heading, Paragraph, Spacer, Card, Button, CodeBox, StatusBadge } from '../_shared/email-templates/components.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WelcomeEmailPayload {
  partnerEmail: string;
  partnerName: string;
  companyName: string;
  magicLink?: string;
  temporaryPassword?: string;
  adminName?: string;
  strategistName?: string;
  strategistEmail?: string;
  inviteCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WelcomeEmailPayload = await req.json();

    if (!payload.partnerEmail || !payload.partnerName || !payload.companyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const appUrl = getEmailAppUrl();

    // Build email content using shared components
    const content = `
      ${StatusBadge({ status: 'confirmed', text: 'PARTNER ACCESS GRANTED' })}
      ${Heading({ text: `Welcome to The Quantum Club, ${payload.partnerName}`, level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Dear ${payload.partnerName},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(`Welcome to The Quantum Club's exclusive partner network. We're delighted to have <strong>${payload.companyName}</strong> join our curated community of industry leaders.`, 'secondary')}
      ${Spacer(32)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: 'Your Account is Ready', level: 3 })}
          ${Spacer(8)}
          ${Paragraph('Your partner account has been personally provisioned with pre-verified contact information. Access is waiting for you.', 'secondary')}
        `,
      })}
      ${Spacer(24)}
      ${payload.magicLink ? `
        ${Paragraph('<strong>Getting Started:</strong>', 'primary')}
        ${Spacer(8)}
        ${Paragraph('Click the button below to access your account with a single click (link expires in 72 hours):', 'secondary')}
        ${Spacer(16)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center">
              ${Button({ url: payload.magicLink, text: 'Access Your Account', variant: 'primary' })}
            </td>
          </tr>
        </table>
      ` : ''}
      ${payload.strategistName ? `
        ${Spacer(24)}
        ${Card({
          variant: 'default',
          content: `
            ${Heading({ text: 'Your Dedicated Strategist', level: 3 })}
            ${Spacer(8)}
            ${Paragraph(`<strong>${payload.strategistName}</strong> will be your primary point of contact throughout your journey with The Quantum Club.`, 'secondary')}
            ${payload.strategistEmail ? `${Spacer(8)}${Paragraph(`<a href="mailto:${payload.strategistEmail}" style="color: ${EMAIL_COLORS.gold};">${payload.strategistEmail}</a>`, 'muted')}` : ''}
          `,
        })}
      ` : ''}
      ${payload.inviteCode ? `
        ${Spacer(24)}
        ${Card({
          variant: 'default',
          content: `
            ${Heading({ text: 'Invite Your Team', level: 3 })}
            ${Spacer(8)}
            ${Paragraph('Use the code below to invite your organization members:', 'secondary')}
            ${Spacer(12)}
            ${CodeBox({ code: payload.inviteCode, label: 'Your Invite Code' })}
          `,
        })}
      ` : ''}
      ${Spacer(32)}
      ${Paragraph('If you have any questions or need assistance, please don\'t hesitate to reach out to our concierge team.', 'secondary')}
      ${Spacer(16)}
      ${Paragraph('Best regards,<br><strong>The Quantum Club</strong>', 'secondary')}
    `;

    const html = baseEmailTemplate({
      preheader: `Welcome to The Quantum Club, ${payload.partnerName}. Your partner account is ready.`,
      content,
      showHeader: true,
      showFooter: true,
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.notifications,
          to: payload.partnerEmail,
          subject: `Welcome to The Quantum Club, ${payload.partnerName}`,
          html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Resend API error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: error }),
          { status: 500, headers: corsHeaders },
        );
      }
    } else {
      console.warn('RESEND_API_KEY not configured — email not sent.');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent successfully' }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error in send-partner-welcome:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders },
    );
  }
});
