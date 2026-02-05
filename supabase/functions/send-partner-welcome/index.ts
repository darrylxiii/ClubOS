import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

    // Validate required fields
    if (!payload.partnerEmail || !payload.partnerName || !payload.companyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Build email HTML
    let emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; margin-bottom: 30px; }
          .header h1 { color: #C9A24E; margin: 0; font-size: 24px; }
          .content { margin: 30px 0; }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #C9A24E 0%, #D4B659 100%);
            color: #fff; 
            padding: 12px 30px; 
            border-radius: 6px; 
            text-decoration: none; 
            font-weight: 600;
            margin: 20px 0;
          }
          .info-box { 
            background: #f9f9f9; 
            border-left: 4px solid #C9A24E; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 4px; 
          }
          .footer { 
            border-top: 1px solid #eee; 
            padding-top: 20px; 
            margin-top: 30px; 
            text-align: center; 
            color: #666; 
            font-size: 12px; 
          }
          .badge { 
            display: inline-block; 
            background: #f0f0f0; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
            margin: 5px 5px 5px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌟 Welcome to The Quantum Club</h1>
          </div>

          <div class="content">
            <p>Dear ${escapeHtml(payload.partnerName)},</p>

            <p>Welcome to The Quantum Club's exclusive partner network. We're delighted to have ${escapeHtml(payload.companyName)} join our curated community of industry leaders.</p>

            <div class="info-box">
              <strong>Your Account is Ready</strong>
              <p>Your partner account has been personally provisioned with pre-verified contact information. Access is waiting for you.</p>
            </div>
    `;

    // Add access method information
    if (payload.magicLink) {
      emailContent += `
            <p><strong>Getting Started:</strong></p>
            <p>Click the button below to access your account with a single click (link expires in 72 hours):</p>
            <center>
              <a href="${escapeHtml(payload.magicLink)}" class="cta-button">Access Your Account</a>
            </center>
      `;
    } else if (payload.temporaryPassword) {
      emailContent += `
            <p><strong>Your Temporary Password:</strong></p>
            <div class="info-box" style="font-family: monospace;">
              ${escapeHtml(payload.temporaryPassword)}
            </div>
            <p>Please change this password upon first login for security.</p>
      `;
    }

    // Add strategist information
    if (payload.strategistName) {
      emailContent += `
            <div class="info-box">
              <strong>Your Dedicated Strategist</strong>
              <p>${escapeHtml(payload.strategistName)} will be your primary point of contact throughout your journey with TQC.</p>
              ${payload.strategistEmail ? `<p><a href="mailto:${escapeHtml(payload.strategistEmail)}">${escapeHtml(payload.strategistEmail)}</a></p>` : ''}
            </div>
      `;
    }

    // Add organization invite code if applicable
    if (payload.inviteCode) {
      emailContent += `
            <div class="info-box">
              <strong>Invite Your Team</strong>
              <p>Use the code below to invite your organization members:</p>
              <p style="font-family: monospace; font-size: 14px; font-weight: bold;">${escapeHtml(payload.inviteCode)}</p>
            </div>
      `;
    }

    emailContent += `
            <p>
              If you have any questions or need assistance, please don't hesitate to reach out to our concierge team.
            </p>

            <p>
              Best regards,<br>
              <strong>The Quantum Club</strong><br>
              Luxury Talent Network
            </p>
          </div>

          <div class="footer">
            <p>This email was sent to ${escapeHtml(payload.partnerEmail)} as part of your partner onboarding with The Quantum Club.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'noreply@thequantumclub.com',
          to: payload.partnerEmail,
          subject: `Welcome to The Quantum Club, ${payload.partnerName}`,
          html: emailContent,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Resend API error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: error }),
          { status: 500, headers: corsHeaders }
        );
      }

      await response.json();
    } else {
      console.warn('RESEND_API_KEY not configured - email not sent. Configure Resend API key in environment variables.');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent successfully' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in send-partner-welcome:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
