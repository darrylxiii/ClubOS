import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Sends notification when an interview is cancelled or rescheduled.
 * Body: { user_id, meeting_id, job_title, company_name, event: "cancelled"|"rescheduled", new_time?, reason? }
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, meeting_id, job_title, company_name, event, new_time, reason } = await req.json();

    if (!user_id || !meeting_id || !event) {
      return new Response(
        JSON.stringify({ error: "user_id, meeting_id, and event required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isCancelled = event === "cancelled";
    const eventType = isCancelled ? "interview_cancelled" : "interview_rescheduled";
    const title = isCancelled ? "Interview Cancelled" : "Interview Rescheduled";

    let body: string;
    if (isCancelled) {
      body = `Your interview for ${job_title || "a role"} at ${company_name || "a company"} has been cancelled.`;
      if (reason) body += ` Reason: ${reason}`;
    } else {
      body = `Your interview for ${job_title || "a role"} at ${company_name || "a company"} has been rescheduled.`;
      if (new_time) {
        const date = new Date(new_time);
        const formatted = date.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Amsterdam",
        });
        body += ` New time: ${formatted} (CET).`;
      }
    }

    const emailHtml = buildInterviewChangeEmail({
      title,
      jobTitle: job_title || "Your Interview",
      companyName: company_name || "",
      body,
      isCancelled,
      meetingId: meeting_id,
    });

    const { data: result, error: invokeError } = await supabase.functions.invoke(
      "send-candidate-notification",
      {
        body: {
          user_id,
          event_type: eventType,
          event_id: `${eventType}-${meeting_id}`,
          payload: {
            title,
            body,
            email_html: emailHtml,
            route: `/meetings/${meeting_id}`,
            data: { meetingId: meeting_id, jobTitle: job_title, companyName: company_name, event },
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
    console.error("[interview-cancelled] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildInterviewChangeEmail(opts: {
  title: string;
  jobTitle: string;
  companyName: string;
  body: string;
  isCancelled: boolean;
  meetingId: string;
}): string {
  const accentColor = opts.isCancelled ? "#dc2626" : "#C9A24E";
  const ctaText = opts.isCancelled ? "View Details" : "View Updated Schedule";

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
          <h1 style="margin:0 0 8px;font-size:22px;color:${accentColor};">${opts.title}</h1>
          <p style="margin:0 0 8px;font-size:14px;color:#999;">
            ${opts.jobTitle}${opts.companyName ? ` at ${opts.companyName}` : ""}
          </p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#F5F4EF;">
            ${opts.body}
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background-color:${accentColor};border-radius:6px;padding:12px 28px;">
              <a href="https://thequantumclub.lovable.app/meetings" style="color:${opts.isCancelled ? "#fff" : "#0E0E10"};text-decoration:none;font-weight:600;font-size:14px;">
                ${ctaText}
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