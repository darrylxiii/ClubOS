import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer, Card, InfoRow, StatusBadge, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name",
};

interface PasswordChangedEmailRequest {
  email: string;
  userName: string;
  timestamp: string;
  deviceInfo: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      userName,
      timestamp,
      deviceInfo
    }: PasswordChangedEmailRequest = await req.json();

    console.log('Sending password changed confirmation to:', email);
    
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.security,
        to: [email],
        subject: "✅ Your Password Has Been Changed - The Quantum Club",
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await emailResponse.json();
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
