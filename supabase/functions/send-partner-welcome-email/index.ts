/**
 * Send Partner Welcome Email
 * Dedicated welcome experience for approved/provisioned partners.
 * Replaces the generic candidate-style welcome that was previously sent.
 */

import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, StatusBadge, InfoRow, Divider,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';

interface PartnerWelcomeRequest {
  email: string;
  fullName: string;
  companyName?: string;
  magicLink?: string;
  inviteCode?: string;
  welcomeMessage?: string;
  assignedStrategistName?: string;
  provisionMethod?: 'magic_link' | 'password' | 'oauth_only';
}

Deno.serve(createHandler(async (req, ctx) => {
  const body: PartnerWelcomeRequest = await req.json();
  const { email, fullName, companyName, magicLink, inviteCode, welcomeMessage, assignedStrategistName, provisionMethod } = body;

  if (!email || !fullName) {
    return new Response(
      JSON.stringify({ error: 'email and fullName are required' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[send-partner-welcome-email] Sending to ${email} for ${companyName || 'unknown company'}`);

  const appUrl = getEmailAppUrl();
  const dashboardUrl = `${appUrl}/dashboard`;
  const teamUrl = `${appUrl}/settings?tab=team`;

  // Build onboarding checklist
  const onboardingSteps = [
    { icon: '🏢', text: 'Complete your company profile' },
    { icon: '👥', text: 'Invite your team members' },
    { icon: '📋', text: 'Post your first role' },
    { icon: '🤝', text: 'Meet your assigned strategist' },
  ];

  // Primary CTA based on provision method
  const hasMagicLink = provisionMethod === 'magic_link' && magicLink;
  const primaryCtaUrl = hasMagicLink ? magicLink : `${appUrl}/auth`;
  const primaryCtaText = hasMagicLink ? 'Access Your Dashboard' : 'Sign In to Get Started';

  const emailContent = `
    ${StatusBadge({ status: 'confirmed', text: 'PARTNER ACCESS GRANTED' })}
    ${Heading({ text: 'Welcome to The Quantum Club', level: 1, align: 'center' })}
    ${Spacer(24)}
    ${Paragraph(`Dear ${fullName},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`Congratulations${companyName ? ` — <strong>${companyName}</strong> is` : ', you are'} now part of The Quantum Club's exclusive partner network. We connect you with pre-vetted, top-tier talent to accelerate your hiring.`, 'secondary')}
    ${welcomeMessage ? `
      ${Spacer(16)}
      ${Card({
        variant: 'highlight',
        content: `
          <p style="margin: 0; font-size: 14px; font-style: italic; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.6;">
            "${welcomeMessage}"
          </p>
          ${assignedStrategistName ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: ${EMAIL_COLORS.textMuted};">— ${assignedStrategistName}, Your Strategist</p>` : ''}
        `,
      })}
    ` : ''}
    ${Spacer(32)}
    ${Card({
      variant: 'default',
      content: `
        ${Heading({ text: 'Your Onboarding Checklist', level: 3 })}
        ${Spacer(12)}
        ${onboardingSteps.map(step => `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 10px;">
            <tr>
              <td width="28" style="font-size: 16px; vertical-align: top; padding-top: 2px;">${step.icon}</td>
              <td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.6;">${step.text}</td>
            </tr>
          </table>
        `).join('')}
      `,
    })}
    ${Spacer(32)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({ url: primaryCtaUrl, text: primaryCtaText, variant: 'primary' })}
        </td>
      </tr>
    </table>
    ${hasMagicLink ? `
      ${Spacer(12)}
      ${Paragraph('This link expires in 72 hours. After that, use the regular sign-in page.', 'muted')}
    ` : ''}
    ${Spacer(24)}
    ${Divider({ spacing: 'medium' })}
    ${Spacer(16)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({ url: teamUrl, text: 'Invite Your Team', variant: 'secondary' })}
        </td>
      </tr>
    </table>
    ${Spacer(24)}
    ${assignedStrategistName
      ? Paragraph(`Your dedicated strategist <strong>${assignedStrategistName}</strong> will reach out shortly to discuss your hiring needs and set up your first role.`, 'secondary')
      : Paragraph('A strategist will be assigned to you shortly and will reach out to discuss your hiring needs.', 'secondary')
    }
    ${Spacer(16)}
    ${Paragraph(`Questions? Contact us at <a href="mailto:partners@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">partners@thequantumclub.nl</a>`, 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: `Welcome to The Quantum Club${companyName ? ` — ${companyName}'s` : ', your'} partner access is ready.`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.partners,
    to: [email],
    subject: `Welcome to The Quantum Club, ${fullName}`,
    html: htmlContent,
  });

  console.log('[send-partner-welcome-email] Sent successfully:', result.id);

  return new Response(
    JSON.stringify({ success: true, emailId: result.id }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
