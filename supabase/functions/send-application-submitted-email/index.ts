import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { EMAIL_SENDERS, EMAIL_COLORS, SUPPORT_EMAIL, getEmailHeaders, htmlToPlainText } from "../_shared/email-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, StatusBadge,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplicationSubmittedRequest {
  userId: string;
  email: string;
  fullName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName, testMode }: ApplicationSubmittedRequest & { testMode?: boolean } = await req.json();

    console.log('[send-application-submitted-email] Processing:', { userId, email, fullName, testMode });

    if (!email || !fullName) {
      throw new Error('Missing required fields: email or fullName');
    }

    const appUrl = getAppUrl();
    let accessToken = 'test-token-12345';

    if (!testMode && userId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: profile, error: profileError } = await supabaseAdmin
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

    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.notifications,
          to: [email],
          subject,
          html: htmlContent,
          text: htmlToPlainText(htmlContent),
          headers: getEmailHeaders(),
        }),
      });

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error('[send-application-submitted-email] Resend error:', error);
        throw new Error(`Failed to send email: ${error}`);
      }

      const emailResponse = await resendResponse.json();
      console.log('[send-application-submitted-email] Email sent successfully:', emailResponse);

      return new Response(
        JSON.stringify({ success: true, emailId: emailResponse.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.warn('[send-application-submitted-email] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[send-application-submitted-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
