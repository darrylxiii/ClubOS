import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('VITE_SUPABASE_URL')?.replace('/rest/v1', '') || 'https://app.thequantumclub.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  email: string;
  fullName: string;
  requestType: 'candidate' | 'partner';
  status: 'approved' | 'declined';
  declineReason?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName, requestType, status, declineReason }: NotificationRequest = await req.json();

    console.log('[send-approval-notification] Processing:', { userId, email, requestType, status });

    // Generate email content based on status
    const subject = status === 'approved' 
      ? '🎉 Welcome to The Quantum Club!' 
      : 'Update on Your Application';

    const htmlContent = status === 'approved' ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0E0E10 0%, #1a1a1d 100%); color: #F5F4EF; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #C9A24E; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">Welcome to The Quantum Club</h1>
            </div>
            <div class="content">
              <p>Dear ${fullName},</p>
              
              <p>Congratulations! We're thrilled to inform you that your application has been <strong>approved</strong>.</p>
              
              ${requestType === 'candidate' ? `
                <div class="highlight">
                  <p style="margin: 0;"><strong>What's Next:</strong></p>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Darryl will contact you within 19 minutes (avg. response time)</li>
                    <li>Schedule your initial consultation call</li>
                    <li>Get matched with exclusive opportunities</li>
                    <li>Access our full suite of career tools</li>
                  </ul>
                </div>
              ` : `
                <div class="highlight">
                  <p style="margin: 0;"><strong>What's Next:</strong></p>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Darryl will reach out within 19 minutes to discuss your hiring needs</li>
                    <li>Complete your company profile and post your first role</li>
                    <li>Access our vetted talent pool</li>
                    <li>Start building your team</li>
                  </ul>
                </div>
              `}
              
              <div style="text-align: center;">
                <a href="${APP_URL}/auth" class="button">
                  Log In Now
                </a>
              </div>
              
              <p style="margin-top: 30px;">If you have any questions, our team is here to help at <a href="mailto:hello@thequantumclub.com">hello@thequantumclub.com</a> or reach out to Darryl directly at <a href="mailto:darryl@thequantumclub.nl">darryl@thequantumclub.nl</a>.</p>
              
              <p>Welcome aboard,<br><strong>The Quantum Club Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 The Quantum Club. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f3f4f6; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .reason-box { padding: 15px; background: #f9fafb; border-left: 4px solid #d1d5db; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px; color: #1f2937;">Application Update</h1>
            </div>
            <div class="content">
              <p>Dear ${fullName},</p>
              
              <p>Thank you for your interest in joining The Quantum Club.</p>
              
              <p>After careful review, we've decided not to move forward with your application at this time.</p>
              
              ${declineReason ? `<div class="reason-box"><strong>Feedback:</strong><br>${declineReason}</div>` : ''}
              
              <p>We appreciate you taking the time to apply and wish you all the best in your ${requestType === 'candidate' ? 'career' : 'business'} journey.</p>
              
              <p>If you have any questions, feel free to reach out to us at <a href="mailto:hello@thequantumclub.com">hello@thequantumclub.com</a>.</p>
              
              <p>Best regards,<br><strong>The Quantum Club Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 The Quantum Club. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend (if configured)
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'The Quantum Club <hello@thequantumclub.com>',
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

      console.log('[send-approval-notification] Email sent successfully to:', email);
    } else {
      console.warn('[send-approval-notification] RESEND_API_KEY not configured, email not sent');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-approval-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
