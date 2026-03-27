import { createHandler } from '../_shared/handler.ts';
import { EMAIL_SENDERS, EMAIL_COLORS, SUPPORT_EMAIL } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, StatusBadge,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";

interface ApplicationSubmittedRequest {
  userId: string;
  email: string;
  fullName: string;
}

Deno.serve(createHandler(async (req, ctx) => {
    const { userId, email, fullName, testMode }: ApplicationSubmittedRequest & { testMode?: boolean } = await req.json();

    console.log('[send-application-submitted-email] Processing:', { userId, email, fullName, testMode });

    if (!email || !fullName) {
      throw new Error('Missing required fields: email or fullName');
    }

    const appUrl = getAppUrl();
    let accessToken = 'test-token-12345';

    if (!testMode && userId) {
      const { data: profile, error: profileError } = await ctx.supabase
        .from('profiles')
        .select('application_access_token')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[send-application-submitted-email] Error fetching profile:', profileError);
      } else if (profile?.application_access_token) {
        accessToken = profile.application_access_token;
      }
    }

    const statusUrl = `${appUrl}/application/status/${accessToken}`;
    const subject = 'Application Received — The Quantum Club';

    const steps = [
      'Your application will be reviewed (typically within 24–48 hours)',
      'You\'ll receive an email with the decision',
      'If approved, you\'ll get a direct login link to access your dashboard',
    ];

    const emailContent = `
      ${StatusBadge({ status: 'confirmed', text: 'RECEIVED' })}
      ${Heading({ text: 'Application Received', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Dear ${fullName},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph('Thank you for applying to The Quantum Club. Your application has been successfully submitted and is now under review.', 'secondary')}
      ${Spacer(24)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: 'What happens next', level: 3 })}
          ${Spacer(12)}
          ${steps.map((step, i) => `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px;">
              <tr>
                <td style="font-size: 14px; color: ${EMAIL_COLORS.textSecondary}; line-height: 1.6;">
                  <strong style="color: ${EMAIL_COLORS.textPrimary};">${i + 1}.</strong> ${step}
                </td>
              </tr>
            </table>
          `).join('')}
        `,
      })}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: statusUrl, text: 'View Your Application Status', variant: 'primary' })}
          </td>
        </tr>
      </table>
      ${Spacer(24)}
      ${Paragraph(`Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${EMAIL_COLORS.gold};">${SUPPORT_EMAIL}</a>`, 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: 'Your application to The Quantum Club has been received and is under review.',
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    const emailResponse = await sendEmail({
      from: EMAIL_SENDERS.notifications,
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log('[send-application-submitted-email] Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
