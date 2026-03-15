import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Sends multi-channel notification when a new job match is found for a candidate.
 * Body: { user_id, job_id, job_title, company_name, match_score, match_reasons[] }
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, job_id, job_title, company_name, match_score, match_reasons } = await req.json();

    if (!user_id || !job_id || !job_title) {
      return new Response(
        JSON.stringify({ error: "user_id, job_id, and job_title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const score = match_score || 0;
    const reasons = match_reasons || [];
    const reasonText = reasons.length > 0 ? reasons.slice(0, 3).join(" · ") : "";
    const body = reasonText
      ? `${job_title} at ${company_name || "a leading company"} — ${score}% match. ${reasonText}`
      : `${job_title} at ${company_name || "a leading company"} — ${score}% match with your profile.`;

    const emailHtml = buildJobMatchEmail({
      jobTitle: job_title,
      companyName: company_name || "A Leading Company",
      matchScore: score,
      matchReasons: reasons,
      jobId: job_id,
    });

    const { data: result, error: invokeError } = await supabase.functions.invoke(
      "send-candidate-notification",
      {
        body: {
          user_id,
          event_type: "job_match",
          event_id: `job-match-${job_id}-${user_id}`,
          payload: {
            title: "New Job Match",
            body,
            email_html: emailHtml,
            route: `/jobs/${job_id}`,
            data: { jobId: job_id, jobTitle: job_title, companyName: company_name, matchScore: score },
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
    console.error("[job-match-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildJobMatchEmail(opts: {
  jobTitle: string;
  companyName: string;
  matchScore: number;
  matchReasons: string[];
  jobId: string;
}): string {
  const reasonsHtml = opts.matchReasons.length > 0
    ? opts.matchReasons.map(r => `<li style="margin:4px 0;color:#F5F4EF;">${r}</li>`).join("")
    : "";

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
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#C9A24E;">New Job Match</h1>
          <p style="margin:0 0 16px;font-size:18px;color:#F5F4EF;font-weight:600;">
            ${opts.jobTitle}
          </p>
          <p style="margin:0 0 8px;font-size:14px;color:#999;">at ${opts.companyName}</p>
          <table cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
            <tr><td style="background-color:#2a2a2d;border-radius:6px;padding:12px 20px;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#C9A24E;">${opts.matchScore}%</span>
              <br/><span style="font-size:12px;color:#999;">Match Score</span>
            </td></tr>
          </table>
          ${reasonsHtml ? `<p style="margin:0 0 8px;font-size:13px;color:#999;">Why this matches:</p><ul style="margin:0 0 24px;padding-left:20px;">${reasonsHtml}</ul>` : ""}
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#C9A24E;border-radius:6px;padding:12px 28px;">
              <a href="https://thequantumclub.lovable.app/jobs/${opts.jobId}" style="color:#0E0E10;text-decoration:none;font-weight:600;font-size:14px;">
                View Role
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