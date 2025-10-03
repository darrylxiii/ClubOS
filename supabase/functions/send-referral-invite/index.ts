import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Resend API will be called via fetch
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Club <onboarding@resend.dev>",
        to: [friendEmail],
        subject: `${referrerName} thinks you'd be perfect for ${jobTitle} at ${companyName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">You've been referred to an exciting opportunity!</h1>
            
            <p>Hi ${friendName},</p>
            
            <p><strong>${referrerName}</strong> thinks you'd be a great fit for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Why this referral?</h2>
              <p>Your friend has already filled in some of your professional details to help speed up your application process. You'll be able to review and edit everything during signup.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Get Started →
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This invite link expires in 30 days. Your information is kept secure and you can edit or delete it at any time.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            
            <p style="color: #999; font-size: 12px;">
              If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
        `,
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