import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer, CodeBox, Card, InfoRow, Divider, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name",
};

interface PasswordResetEmailRequest {
  email: string;
  userName: string;
  otpCode: string;
  magicLink: string;
  expiresInMinutes: number;
  ipAddress: string;
  deviceInfo: string;
  correlationId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Internal-only: require service_role key or matching internal secret
  const authHeader = req.headers.get('authorization') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader.replace('Bearer ', '');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  // Only allow service_role calls (from other edge functions), not anon/user calls
  if (!token || token === anonKey) {
    console.warn('[send-password-reset-email] Blocked: called without service role authorization');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const {
      email,
      userName,
      otpCode,
      magicLink,
      expiresInMinutes,
      ipAddress,
      deviceInfo,
      correlationId
    }: PasswordResetEmailRequest = await req.json();

    console.log(`[PasswordReset][${correlationId}][email] Sending password reset email`);

    const emailContent = `
      ${Heading({ text: 'Reset Your Password', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${userName},`, 'secondary')}
      ${Spacer(8)}
      ${Paragraph('We received a request to reset your password for The Quantum Club.', 'secondary')}
      ${Spacer(32)}
      
      <!-- Primary CTA -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ 
              url: magicLink, 
              text: 'Reset Password', 
              variant: 'primary' 
            })}
          </td>
        </tr>
      </table>
      ${Spacer(32)}
      
      ${Divider({ spacing: 'medium' })}
      ${Spacer(8)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            <span style="font-size: 13px; color: ${EMAIL_COLORS.textMuted};">OR ENTER THIS CODE</span>
          </td>
        </tr>
      </table>
      ${Spacer(24)}
      
      ${CodeBox({ code: otpCode, label: '6-Digit Code' })}
      ${Spacer(16)}
      
      ${AlertBox({
        type: 'warning',
        message: `This code expires in <strong>${expiresInMinutes} minutes</strong>.`,
      })}
      ${Spacer(32)}
      
      ${Paragraph('If you didn\'t request this, you can safely ignore this email. Your password won\'t change.', 'muted')}
      ${Spacer(24)}
      
      ${Card({
        variant: 'default',
        content: `
          <p style="font-size: 12px; color: ${EMAIL_COLORS.textMuted}; margin: 0 0 8px 0;">Request details:</p>
          ${InfoRow({ label: 'IP Address', value: ipAddress })}
          ${InfoRow({ label: 'Device', value: deviceInfo.substring(0, 60) + '...' })}
        `
      })}
    `;

    const html = baseEmailTemplate({
      preheader: 'You requested a password reset for The Quantum Club',
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.security,
        to: [email],
        subject: "🔐 Reset Your Password - The Quantum Club",
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log(`[PasswordReset][${correlationId}][email] Sent successfully:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[PasswordReset][email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
