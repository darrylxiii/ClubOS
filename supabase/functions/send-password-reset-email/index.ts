import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Heading, Paragraph, Spacer } from "../_shared/email-templates/components.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetEmailRequest {
  email: string;
  userName: string;
  otpCode: string;
  magicLink: string;
  expiresInMinutes: number;
  ipAddress: string;
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
      otpCode,
      magicLink,
      expiresInMinutes,
      ipAddress,
      deviceInfo
    }: PasswordResetEmailRequest = await req.json();

    console.log('Sending password reset email to:', email);

    const emailContent = `
      ${Heading({ text: 'Password Reset Request', level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${userName},`, 'secondary')}
      ${Spacer(16)}
      ${Paragraph('We received a request to reset your password for The Quantum Club.', 'secondary')}
      ${Spacer(32)}
      
      <!-- Primary CTA: Magic Link Button -->
      ${Button({ 
        url: magicLink, 
        text: 'Reset Password', 
        variant: 'primary' 
      })}
      ${Spacer(32)}
      
      <!-- Divider -->
      <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; padding: 0 16px; color: #666; font-size: 14px; position: relative;">
          <span style="background: #0E0E10; padding: 0 12px; position: relative; z-index: 1;">OR</span>
          <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.1); z-index: 0;"></div>
        </div>
      </div>
      ${Spacer(32)}
      
      <!-- OTP Code Display -->
      ${Paragraph('Enter this 6-digit code:', 'muted')}
      ${Spacer(16)}
      <div style="
        background: rgba(255,255,255,0.03);
        border: 2px dashed rgba(201,162,78,0.3);
        border-radius: 12px;
        padding: 32px 24px;
        text-align: center;
        margin: 24px 0;
      ">
        <div style="
          font-family: 'Courier New', monospace;
          font-size: 40px;
          letter-spacing: 12px;
          font-weight: bold;
          color: #C9A24E;
          margin: 0;
          text-align: center;
        ">${otpCode}</div>
      </div>
      ${Spacer(16)}
      ${Paragraph('Code expires in ' + expiresInMinutes + ' minutes', 'muted')}
      ${Spacer(32)}
      
      ${Paragraph('If you didn\'t request this, you can safely ignore this email.', 'muted')}
      ${Spacer(24)}
      
      <!-- Footer Metadata -->
      <div style="
        margin-top: 32px; 
        padding-top: 24px; 
        border-top: 1px solid rgba(255,255,255,0.1);
      ">
        ${Paragraph('Request details:', 'muted')}
        ${Spacer(16)}
        ${Paragraph('IP: ' + ipAddress, 'muted')}
        ${Spacer(16)}
        ${Paragraph('Device: ' + deviceInfo.substring(0, 100), 'muted')}
      </div>
    `;

    const html = baseEmailTemplate({
      preheader: `Your password reset code: ${otpCode}`,
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
        from: "The Quantum Club <onboarding@resend.dev>",
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
    console.log("Password reset email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
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
