import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer, Card, InfoRow, StatusBadge, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface PasswordChangedEmailRequest {
  email: string;
  userName: string;
  timestamp: string;
  deviceInfo: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Internal-only: require service_role key, not anon/user calls
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!token || token === anonKey) {
    console.warn('[send-password-changed-email] Blocked: called without service role authorization');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const {
      email,
      userName,
      timestamp,
      deviceInfo
    }: PasswordChangedEmailRequest = await req.json();

    console.log('[send-password-changed-email] Sending password changed confirmation');
    
    const appUrl = getEmailAppUrl();

    const emailContent = `
      ${StatusBadge({ status: 'confirmed', text: 'PASSWORD CHANGED' })}
      ${Heading({ text: 'Password Successfully Changed', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${userName},`, 'secondary')}
      ${Spacer(8)}
      ${Paragraph('Your password was successfully changed.', 'secondary')}
      ${Spacer(32)}
      ${Card({
        variant: 'default',
        content: `
          ${Heading({ text: 'Change Details', level: 3 })}
          ${Spacer(12)}
          ${InfoRow({ icon: '🕐', label: 'Time', value: timestamp })}
          ${InfoRow({ icon: '💻', label: 'Device', value: deviceInfo.substring(0, 80) })}
        `
      })}
      ${Spacer(24)}
      ${AlertBox({
        type: 'error',
        title: 'Wasn\'t you?',
        message: 'If you didn\'t make this change, your account may be compromised. Contact support immediately.',
      })}
      ${Spacer(24)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ 
              url: `${appUrl}/settings/security`, 
              text: 'Review Account Security', 
              variant: 'secondary' 
            })}
          </td>
        </tr>
      </table>
      ${Spacer(24)}
      ${Paragraph('For your security, all active sessions have been logged out. Please log in with your new password.', 'muted')}
    `;

    const html = baseEmailTemplate({
      preheader: 'Your password has been changed successfully',
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    const result = await sendEmail({
      from: EMAIL_SENDERS.security,
      to: [email],
      subject: "Your Password Has Been Changed - The Quantum Club",
      html,
    });

    console.log("Password changed confirmation sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending password changed email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
