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
import { z, parseBody, emailSchema, nameSchema, optionalNameSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const bodySchema = z.object({
  email: emailSchema,
  fullName: nameSchema,
  companyName: optionalNameSchema,
  magicLink: z.string().url().optional(),
  inviteCode: z.string().optional(),
  welcomeMessage: z.string().max(1000).optional(),
  assignedStrategistName: optionalNameSchema,
  provisionMethod: z.enum(['magic_link', 'password', 'oauth_only']).optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, bodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { email, fullName, companyName, magicLink, inviteCode, welcomeMessage, assignedStrategistName, provisionMethod } = parsed.data;

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
    ${Paragraph(`Dear ${sanitizeForEmail(fullName)},`, 'primary')}
    ${Spacer(8)}
    ${Paragraph(`Congratulations${companyName ? ` — <strong>${sanitizeForEmail(companyName)}</strong> is` : ', you are'} now part of The Quantum Club's exclusive partner network. We connect you with pre-vetted, top-tier talent to accelerate your hiring.`, 'secondary')}
    ${welcomeMessage ? `
      ${Spacer(16)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Paragraph(`<em>"${sanitizeForEmail(welcomeMessage)}"</em>`, 'secondary')}
          ${assignedStrategistName ? Paragraph(`— ${sanitizeForEmail(assignedStrategistName)}, Your Strategist`, 'muted') : ''}
        `,
      })}
    ` : ''}
    ${Spacer(32)}
    ${Card({
      variant: 'default',
      content: `
        ${Heading({ text: 'Your Onboarding Checklist', level: 3 })}
        ${Spacer(12)}
        ${onboardingSteps.map(step => Paragraph(`${step.icon} ${step.text}`, 'secondary')).join(Spacer(4))}
      `,
    })}
    ${Spacer(32)}
    ${Button({ url: primaryCtaUrl, text: primaryCtaText, variant: 'primary' })}
    ${hasMagicLink ? `
      ${Spacer(12)}
      ${Paragraph('This link expires in 72 hours. After that, use the regular sign-in page.', 'muted')}
    ` : ''}
    ${Spacer(24)}
    ${Divider({ spacing: 'medium' })}
    ${Spacer(16)}
    ${Button({ url: teamUrl, text: 'Invite Your Team', variant: 'secondary' })}
    ${Spacer(24)}
    ${assignedStrategistName
      ? Paragraph(`Your dedicated strategist <strong>${sanitizeForEmail(assignedStrategistName)}</strong> will reach out shortly to discuss your hiring needs and set up your first role.`, 'secondary')
      : Paragraph('A strategist will be assigned to you shortly and will reach out to discuss your hiring needs.', 'secondary')
    }
    ${Spacer(16)}
    ${Paragraph(`Questions? Contact us at <a href="mailto:partners@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">partners@thequantumclub.nl</a>`, 'muted')}
  `;

  const htmlContent = baseEmailTemplate({
    preheader: `Welcome to The Quantum Club${companyName ? ` — ${sanitizeForEmail(companyName)}'s` : ', your'} partner access is ready.`,
    content: emailContent,
    showHeader: true,
    showFooter: true,
  });

  const result = await sendEmail({
    from: EMAIL_SENDERS.partners,
    to: [email],
    subject: `Welcome to The Quantum Club, ${sanitizeForEmail(fullName)}`,
    html: htmlContent,
  });

  console.log('[send-partner-welcome-email] Sent successfully:', result.id);

  return new Response(
    JSON.stringify({ success: true, emailId: result.id }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
