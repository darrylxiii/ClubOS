import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, AlertBox, StatusBadge, InfoRow,
} from "../_shared/email-templates/components.ts";
import { getAppUrl } from "../_shared/app-config.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  email: string;
  fullName: string;
  requestType?: 'candidate' | 'partner';
  status: 'approved' | 'declined';
  declineReason?: string;
  testMode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName, requestType = 'candidate', status, declineReason, testMode }: NotificationRequest = await req.json();

    console.log('[send-approval-notification] Processing:', { userId, email, requestType, status, testMode });

    if (!email || !fullName) {
      throw new Error('Missing required fields: email or fullName');
    }

    const appUrl = getAppUrl();
    let loginUrl = `${appUrl}/auth`;

    // For approved users, generate a magic link for direct login
    if (status === 'approved') {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: { redirectTo: `${appUrl}/home` }
        });

        if (linkError) {
          console.error('[send-approval-notification] Magic link generation error:', linkError);
        } else if (linkData?.properties?.hashed_token) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          loginUrl = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(`${appUrl}/home`)}`;
          console.log('[send-approval-notification] Magic link generated successfully');
        }
      } catch (magicLinkError) {
        console.error('[send-approval-notification] Failed to generate magic link:', magicLinkError);
      }
    }

    const subject = status === 'approved'
      ? '🎉 Welcome to The Quantum Club!'
      : 'Update on Your Application';

    // Build content using shared component system
    let emailContent: string;

    if (status === 'approved') {
      const nextSteps = requestType === 'candidate'
        ? [
            'Darryl will contact you within 19 minutes (avg. response time)',
            'Schedule your initial consultation call',
            'Get matched with exclusive opportunities',
            'Access our full suite of career tools',
          ]
        : [
            'Darryl will reach out within 19 minutes to discuss your hiring needs',
            'Complete your company profile and post your first role',
            'Access our vetted talent pool',
          ];

      emailContent = `
        ${StatusBadge({ status: 'confirmed', text: 'APPROVED' })}
        ${Heading({ text: 'Welcome to The Quantum Club!', level: 1, align: 'center' })}
        ${Spacer(24)}
        ${Paragraph(`Dear ${fullName},`, 'primary')}
        ${Spacer(8)}
        ${Paragraph('Congratulations! We\'re thrilled to inform you that your application has been <strong style="color: #22c55e;">APPROVED</strong>. You are now a member of The Quantum Club\'s exclusive talent network.', 'secondary')}
        ${Spacer(32)}
        ${Card({
          variant: 'highlight',
          content: `
            ${Heading({ text: '✨ What\'s Next', level: 3 })}
            ${Spacer(12)}
            ${nextSteps.map(step => `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px;">
                <tr>
                  <td style="font-size: 14px; color: #555555; line-height: 1.6;">• ${step}</td>
                </tr>
              </table>
            `).join('')}
          `,
        })}
        ${Spacer(32)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center">
              ${Button({ url: loginUrl, text: 'Access Your Dashboard', variant: 'primary' })}
            </td>
          </tr>
        </table>
        ${Spacer(16)}
        ${Paragraph('This link expires in 24 hours. After that, please use the regular login page.', 'muted')}
        ${Spacer(24)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 8px;">
          <tr>
            <td style="font-size: 14px; color: #888888; line-height: 1.6;">
              Questions? Contact us at <a href="mailto:onboarding@verify.thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">onboarding@verify.thequantumclub.nl</a> or reach out to Darryl directly at <a href="mailto:darryl@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">darryl@thequantumclub.nl</a>
            </td>
          </tr>
        </table>
        ${Spacer(24)}
        ${Paragraph('Welcome aboard,<br><strong>The Quantum Club Team</strong>', 'secondary')}
      `;
    } else {
      emailContent = `
        ${Heading({ text: 'Application Update', level: 1 })}
        ${Spacer(24)}
        ${Paragraph(`Dear ${fullName},`, 'primary')}
        ${Spacer(8)}
        ${Paragraph('Thank you for your interest in joining The Quantum Club.', 'secondary')}
        ${Spacer(8)}
        ${Paragraph('After careful review, we\'ve decided not to move forward with your application at this time.', 'secondary')}
        ${declineReason ? `
          ${Spacer(24)}
          ${Card({
            variant: 'default',
            content: `
              ${Heading({ text: 'Feedback', level: 3 })}
              ${Spacer(8)}
              ${Paragraph(declineReason, 'secondary')}
            `,
          })}
        ` : ''}
        ${Spacer(16)}
        ${Paragraph(`We appreciate you taking the time to apply and wish you all the best in your ${requestType === 'candidate' ? 'career' : 'business'} journey.`, 'secondary')}
        ${Spacer(8)}
        ${Paragraph('If you have any questions, feel free to reach out to us at <a href="mailto:onboarding@verify.thequantumclub.nl" style="color: ' + EMAIL_COLORS.gold + ';">onboarding@verify.thequantumclub.nl</a>', 'muted')}
        ${Spacer(24)}
        ${Paragraph('Best regards,<br><strong>The Quantum Club Team</strong>', 'secondary')}
      `;
    }

    const htmlContent = baseEmailTemplate({
      preheader: status === 'approved' ? 'Welcome to The Quantum Club! Your application has been approved.' : 'An update on your application to The Quantum Club.',
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send email via Resend
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
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error('[send-approval-notification] Resend error:', error);
        throw new Error(`Failed to send email: ${error}`);
      }

      const emailResponse = await resendResponse.json();
      console.log('[send-approval-notification] Email sent successfully to:', email);

      // Log notification to database
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        await fetch(`${supabaseUrl}/rest/v1/approval_notification_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            user_id: userId,
            request_type: requestType,
            notification_type: 'email',
            status: 'sent',
            metadata: {
              email_id: emailResponse.id,
              email: email,
              subject: subject,
              approval_status: status,
            },
          }),
        });
      } catch (logError) {
        console.warn('[send-approval-notification] Failed to log notification:', logError);
      }
    } else {
      console.warn('[send-approval-notification] RESEND_API_KEY not configured');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-approval-notification] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
