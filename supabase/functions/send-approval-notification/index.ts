import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { EMAIL_SENDERS, EMAIL_LOGOS, EMAIL_COLORS, EMAIL_LOGO_SIZES } from "../_shared/email-config.ts";
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

        // Generate a magic link using Supabase Admin API
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${appUrl}/home`
          }
        });

        if (linkError) {
          console.error('[send-approval-notification] Magic link generation error:', linkError);
          // Fall back to regular auth URL
        } else if (linkData?.properties?.hashed_token) {
          // Build the confirmation URL
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          loginUrl = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(`${appUrl}/home`)}`;
          console.log('[send-approval-notification] Magic link generated successfully');
        }
      } catch (magicLinkError) {
        console.error('[send-approval-notification] Failed to generate magic link:', magicLinkError);
        // Continue with regular auth URL
      }
    }

    const subject = status === 'approved' 
      ? '🎉 Welcome to The Quantum Club!' 
      : 'Update on Your Application';

    const htmlContent = status === 'approved' ? `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to The Quantum Club</title>
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
                      
                      <!-- Celebration Icon -->
                      <div style="text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 48px;">🎉</span>
                      </div>
                      
                      <!-- Title -->
                      <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary}; text-align: center;">
                        Welcome to The Quantum Club!
                      </h1>
                      
                      <!-- Greeting -->
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textPrimary};">
                        Dear ${fullName},
                      </p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textSecondary};">
                        Congratulations! We're thrilled to inform you that your application has been <strong style="color: ${EMAIL_COLORS.success};">APPROVED</strong>. You are now a member of The Quantum Club's exclusive talent network.
                      </p>
                      
                      <!-- What's Next Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                        <tr>
                          <td style="background-color: rgba(201, 162, 78, 0.1); border-radius: 8px; padding: 20px; border-left: 3px solid ${EMAIL_COLORS.gold};">
                            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${EMAIL_COLORS.gold};">
                              ✨ What's Next:
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              ${requestType === 'candidate' ? `
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  • Darryl will contact you within 19 minutes (avg. response time)
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  • Schedule your initial consultation call
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  • Get matched with exclusive opportunities
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  • Access our full suite of career tools
                                </td>
                              </tr>
                              ` : `
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  • Darryl will reach out within 19 minutes to discuss your hiring needs
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  • Complete your company profile and post your first role
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                                  • Access our vetted talent pool
                                </td>
                              </tr>
                              `}
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: ${EMAIL_COLORS.gold}; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px;">
                              Access Your Dashboard
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.6; color: ${EMAIL_COLORS.textMuted}; text-align: center;">
                        This link expires in 24 hours. After that, please use the regular login page.
                      </p>
                      
                      <hr style="border: none; border-top: 1px solid ${EMAIL_COLORS.border}; margin: 32px 0;" />
                      
                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.textMuted};">
                        Questions? Contact us at <a href="mailto:onboarding@verify.thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">onboarding@verify.thequantumclub.nl</a> or reach out to Darryl directly at <a href="mailto:darryl@thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">darryl@thequantumclub.nl</a>
                      </p>
                      
                      <p style="margin: 24px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.textPrimary};">
                        Welcome aboard,<br>
                        <strong>The Quantum Club Team</strong>
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
    ` : `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Update</title>
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
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 32px;">
                      
                      <!-- Title -->
                      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary};">
                        Application Update
                      </h1>
                      
                      <!-- Greeting -->
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textPrimary};">
                        Dear ${fullName},
                      </p>
                      
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textSecondary};">
                        Thank you for your interest in joining The Quantum Club.
                      </p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textSecondary};">
                        After careful review, we've decided not to move forward with your application at this time.
                      </p>
                      
                      ${declineReason ? `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                        <tr>
                          <td style="background-color: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; border-left: 3px solid ${EMAIL_COLORS.textMuted};">
                            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary};">
                              Feedback:
                            </p>
                            <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">
                              ${declineReason}
                            </p>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.textSecondary};">
                        We appreciate you taking the time to apply and wish you all the best in your ${requestType === 'candidate' ? 'career' : 'business'} journey.
                      </p>
                      
                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.textMuted};">
                        If you have any questions, feel free to reach out to us at <a href="mailto:onboarding@verify.thequantumclub.nl" style="color: ${EMAIL_COLORS.gold};">onboarding@verify.thequantumclub.nl</a>
                      </p>
                      
                      <p style="margin: 24px 0 0 0; font-size: 16px; color: ${EMAIL_COLORS.textPrimary};">
                        Best regards,<br>
                        <strong>The Quantum Club Team</strong>
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
            'Prefer': 'return=minimal'
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
              has_magic_link: loginUrl !== `${appUrl}/auth`
            }
          })
        });
        console.log('Email notification logged to database');
      } catch (logError) {
        console.error('Failed to log email notification:', logError);
      }
    } else {
      console.warn('[send-approval-notification] RESEND_API_KEY not configured, email not sent');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-approval-notification] Error:', error);
    
    // Log failed notification attempt
    try {
      const bodyText = await req.text();
      const { userId, requestType, email } = JSON.parse(bodyText);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      if (userId && requestType) {
        await fetch(`${supabaseUrl}/rest/v1/approval_notification_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            request_type: requestType,
            notification_type: 'email',
            status: 'failed',
            error_message: error.message,
            metadata: { email }
          })
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
