import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Card, Heading, Paragraph, Spacer, InfoRow } from "../_shared/email-templates/components.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReferralInviteRequest {
  inviteCode: string;
  friendEmail: string;
  friendName: string;
  jobTitle: string;
  companyName: string;
  referrerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteCode, friendEmail, friendName, jobTitle, companyName, referrerName }: ReferralInviteRequest = await req.json();

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://") || "http://localhost:5173";
    const inviteLink = `${appUrl}/auth?invite=${inviteCode}`;

    const emailContent = `
      ${Heading({ text: `${referrerName} thinks you'd be perfect for this role!`, level: 1 })}
      ${Spacer(24)}
      ${Paragraph(`Hi ${friendName},`, 'primary')}
      ${Spacer(16)}
      ${Paragraph(`<strong>${referrerName}</strong> believes you'd be a great fit for an exciting opportunity at <strong>${companyName}</strong>.`, 'secondary')}
      ${Spacer(32)}
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: jobTitle, level: 2 })}
          ${Spacer(16)}
          ${InfoRow({ icon: '🏢', label: 'Company', value: companyName })}
          ${InfoRow({ icon: '👤', label: 'Referred by', value: referrerName })}
          ${Spacer(16)}
          ${Paragraph('Your friend has already filled in some of your professional details to help speed up your application. You\'ll be able to review and edit everything during signup.', 'secondary')}
        `
      })}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: inviteLink, text: 'Get Started →', variant: 'primary' })}
          </td>
        </tr>
      </table>
      ${Spacer(32)}
      ${Paragraph('This invite link expires in 30 days. Your information is kept secure and you can edit or delete it at any time.', 'muted')}
      ${Spacer(16)}
      ${Paragraph('If you didn\'t expect this email, you can safely ignore it.', 'muted')}
    `;

    const html = baseEmailTemplate({
      preheader: `${referrerName} referred you to ${jobTitle} at ${companyName}`,
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
        to: [friendEmail],
        subject: `${referrerName} thinks you'd be perfect for ${jobTitle} at ${companyName}!`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await emailResponse.json();

    console.log("Referral email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-referral-invite function:", error);
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