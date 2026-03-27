import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, Spacer } from "../_shared/email-templates/components.ts";
import { getEmailAppUrl, EMAIL_COLORS } from "../_shared/email-config.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { candidate_user_id, strategist_user_id } = await req.json();

    if (!candidate_user_id || !strategist_user_id) {
      return new Response(
        JSON.stringify({ error: "candidate_user_id and strategist_user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: strategist } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, headline")
      .eq("id", strategist_user_id)
      .single();

    const strategistName = strategist?.full_name || "Your Strategist";
    const strategistTitle = strategist?.headline || "Career Strategist";
    const appUrl = getEmailAppUrl();

    const bodyText = `${strategistName} has been assigned as your career strategist. They will guide you through your job search and help you land the right role.`;

    // Build avatar HTML (table-based for email compatibility)
    const avatarHtml = strategist?.avatar_url
      ? `<img src="${strategist.avatar_url}" alt="${strategistName}" width="64" height="64" style="border-radius: 50%; display: block; margin: 0 auto 12px;" />`
      : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 12px;">
          <tr><td style="width: 64px; height: 64px; border-radius: 50%; background-color: ${EMAIL_COLORS.gold}; text-align: center; vertical-align: middle; font-size: 24px; font-weight: 700; color: ${EMAIL_COLORS.eclipse};">
            ${strategistName.charAt(0)}
          </td></tr>
        </table>`;

    const strategistCardContent = `
      <div style="text-align: center;">
        ${avatarHtml}
        <p style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: ${EMAIL_COLORS.textPrimary};">${strategistName}</p>
        <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.textSecondary};">${strategistTitle}</p>
      </div>
    `;

    const content = `
      ${Heading({ text: 'Meet Your Strategist', level: 1, align: 'center' })}
      ${Spacer(8)}
      ${Card({ content: strategistCardContent, variant: 'highlight' })}
      ${Spacer(16)}
      ${Paragraph('Your dedicated career strategist will help you navigate opportunities, prepare for interviews, and negotiate offers. Feel free to reach out via the messaging feature at any time.')}
      ${Spacer(16)}
      <div style="text-align: center;">
        ${Button({ url: `${appUrl}/messages`, text: 'Send a Message' })}
      </div>
    `;

    const emailHtml = baseEmailTemplate({
      preheader: `${strategistName} is now your career strategist at The Quantum Club`,
      content,
    });

    const { data: result, error: invokeError } = await supabase.functions.invoke(
      "send-candidate-notification",
      {
        body: {
          user_id: candidate_user_id,
          event_type: "strategist_assigned",
          event_id: `strategist-${strategist_user_id}-${candidate_user_id}`,
          payload: {
            title: "Strategist Assigned",
            body: bodyText,
            email_html: emailHtml,
            route: "/home",
            data: { strategistUserId: strategist_user_id, strategistName },
          },
        },
      }
    );

    if (invokeError) throw invokeError;

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[strategist-assigned] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
