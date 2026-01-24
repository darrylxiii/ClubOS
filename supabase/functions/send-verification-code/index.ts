import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { CodeBox, Heading, Paragraph, Spacer, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS } from "../_shared/email-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerificationRequest = await req.json();

    console.log('Sending verification code to:', email);

    const emailContent = `
      ${Heading({ text: 'Verify Your Email', level: 1, align: 'center' })}
      ${Spacer(24)}
      ${Paragraph('Your verification code is ready. Enter this code to complete your email verification:', 'secondary')}
      ${Spacer(32)}
      ${CodeBox({ code, label: 'Verification Code' })}
      ${Spacer(32)}
      ${AlertBox({
        type: 'warning',
        message: 'This code will expire in <strong>10 minutes</strong> for your security.',
      })}
      ${Spacer(16)}
      ${Paragraph('If you didn\'t request this code, you can safely ignore this email.', 'muted')}
    `;

    const html = baseEmailTemplate({
      preheader: `Your verification code: ${code}`,
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
        from: EMAIL_SENDERS.verification,
        to: [email],
        subject: "🔐 Your Verification Code - The Quantum Club",
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await emailResponse.json();

    console.log("Verification email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
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
