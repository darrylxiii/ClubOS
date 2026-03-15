import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Notifies a candidate when a strategist has been assigned to them.
 * Body: { candidate_user_id, strategist_user_id }
 */

serve(async (req) => {
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

    // Get strategist profile
    const { data: strategist } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, headline")
      .eq("id", strategist_user_id)
      .single();

    const strategistName = strategist?.full_name || "Your Strategist";
    const strategistTitle = strategist?.headline || "Career Strategist";

    const body = `${strategistName} has been assigned as your career strategist. They'll guide you through your job search and help you land the right role.`;

    const emailHtml = buildStrategistEmail({
      strategistName,
      strategistTitle,
      avatarUrl: strategist?.avatar_url,
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
            body,
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

function buildStrategistEmail(opts: {
  strategistName: string;
  strategistTitle: string;
  avatarUrl?: string;
}): string {
  const avatarHtml = opts.avatarUrl
    ? `<img src="${opts.avatarUrl}" alt="${opts.strategistName}" width="64" height="64" style="border-radius:50%;display:block;margin:0 auto 12px;" />`
    : `<div style="width:64px;height:64px;border-radius:50%;background-color:#C9A24E;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#0E0E10;font-size:24px;font-weight:700;">${opts.strategistName.charAt(0)}</span>
      </div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#0E0E10;color:#F5F4EF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0E0E10;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1d;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:32px 40px;border-bottom:1px solid #2a2a2d;">
          <img src="https://thequantumclub.lovable.app/lovable-uploads/quantum-club-logo.png" alt="The Quantum Club" width="160" style="display:block;" />
        </td></tr>
        <tr><td style="padding:40px;text-align:center;">
          <h1 style="margin:0 0 24px;font-size:22px;color:#C9A24E;">Meet Your Strategist</h1>
          ${avatarHtml}
          <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#F5F4EF;">${opts.strategistName}</p>
          <p style="margin:0 0 24px;font-size:14px;color:#999;">${opts.strategistTitle}</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#F5F4EF;text-align:left;">
            Your dedicated career strategist will help you navigate opportunities, prepare for interviews, and negotiate offers. Feel free to reach out via the messaging feature at any time.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#C9A24E;border-radius:6px;padding:12px 28px;">
              <a href="https://thequantumclub.lovable.app/messages" style="color:#0E0E10;text-decoration:none;font-weight:600;font-size:14px;">
                Send a Message
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #2a2a2d;font-size:12px;color:#666;">
          <p style="margin:0;">The Quantum Club</p>
          <p style="margin:4px 0 0;">Pieter Cornelisz. Hooftstraat 41-2, Amsterdam, The Netherlands</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}