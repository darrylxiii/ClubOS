import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer } from "../_shared/email-templates/components.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://thequantumclub.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const emailContent = `
      <!-- Success Icon -->
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto;
          background: rgba(34, 197, 94, 0.1);
          border: 2px solid rgba(34, 197, 94, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="font-size: 40px; line-height: 1;">✅</div>
        </div>
      </div>
      
      ${Heading({ text: 'Password Successfully Changed', level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${userName},`, 'secondary')}
      ${Spacer(16)}
      ${Paragraph('Your password was successfully changed on ' + timestamp + '.', 'secondary')}
      ${Spacer(32)}
      
      <!-- Device Info Box -->
      <div style="
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        padding: 20px;
        margin: 24px 0;
      ">
        ${Paragraph('Device: ' + deviceInfo.substring(0, 100), 'muted')}
      </div>
      ${Spacer(32)}
      
      <!-- Security Alert -->
      <div style="
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 16px;
        margin: 24px 0;
      ">
        ${Paragraph('🚨 If you didn\'t make this change, contact support immediately.', 'secondary')}
      </div>
      ${Spacer(32)}
      
      ${Button({ 
        url: APP_URL + '/settings/security', 
        text: 'Review Account Security', 
        variant: 'secondary' 
      })}
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
        from: "The Quantum Club <onboarding@verify.thequantumclub.nl>",
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
