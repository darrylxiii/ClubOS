import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { EMAIL_SENDERS, EMAIL_LOGOS, EMAIL_COLORS, EMAIL_LOGO_SIZES } from "../_shared/email-config.ts";
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

    // For test mode, use a sample token. Otherwise, fetch from database
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
        // Continue with test token for graceful degradation
      } else if (profile?.application_access_token) {
        accessToken = profile.application_access_token;
      }
    }

    const statusUrl = `${appUrl}/application/status/${accessToken}`;

    const subject = '✅ Application Received - The Quantum Club';

    const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Received</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${EMAIL_COLORS.eclipse}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${EMAIL_COLORS.eclipse};">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
            
            <!-- Header with Logo -->
            <tr>
              <td align="center" style="padding-bottom: 32px;">
                <img src="${EMAIL_LOGOS.fullBrand}" alt="The Quantum Club" width="${EMAIL_LOGO_SIZES.headerBrand}" style="display: block; max-width: ${EMAIL_LOGO_SIZES.headerBrand}px; height: auto;" />
              </td>
            </tr>
            
            <!-- Main Card -->
            <tr>
              <td style="background-color: ${EMAIL_COLORS.cardBg}; border-radius: 12px; border: 1px solid ${EMAIL_COLORS.border};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  
                  <!-- Gold Accent Bar -->
                  <tr>
                    <td style="height: 4px; background-color: ${EMAIL_COLORS.gold}; border-radius: 12px 12px 0 0;"></td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 32px;">
                      
                      <!-- Title -->
                      <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary}; text-align: center;">
                        Application Received
                      </h1>
                      
                      <!-- Greeting -->
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textPrimary};">
                        Dear ${fullName},
                      </p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textSecondary};">
                        Thank you for applying to The Quantum Club. Your application has been successfully submitted and is now under review.
                      </p>
                      
                      <!-- What's Next Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                        <tr>
                          <td style="background-color: rgba(201, 162, 78, 0.1); border-radius: 8px; padding: 20px; border-left: 3px solid ${EMAIL_COLORS.gold};">
                            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${EMAIL_COLORS.gold};">
                              📋 What happens next:
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  <strong style="color: ${EMAIL_COLORS.textPrimary};">1.</strong> Darryl will review your application (typically within 24-48 hours)
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  <strong style="color: ${EMAIL_COLORS.textPrimary};">2.</strong> You'll receive an email with the decision
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  <strong style="color: ${EMAIL_COLORS.textPrimary};">3.</strong> If approved, you'll get a direct login link to access your dashboard
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${statusUrl}" target="_blank" style="display: inline-block; background-color: ${EMAIL_COLORS.gold}; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                              View Your Application Status
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.textMuted}; text-align: center;">
                        Questions? Contact us at <a href="mailto:onboarding@verify.thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">onboarding@verify.thequantumclub.nl</a>
                      </p>
                      
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 32px 20px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: ${EMAIL_COLORS.textMuted};">
                  © 2025 The Quantum Club. All rights reserved.
                </p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: ${EMAIL_COLORS.textMuted};">
                  Exclusive Talent Network
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

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
