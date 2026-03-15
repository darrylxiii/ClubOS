import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Offer deadline reminder. Sends via all critical channels (email + SMS + WhatsApp)
 * when an offer is expiring within 48 hours.
 *
 * Can be triggered:
 * - By pg_cron (scans for offers expiring soon)
 * - Manually: { user_id, application_id, job_title, company_name, deadline }
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));

    // Manual trigger mode
    if (body.user_id && body.application_id) {
      const result = await sendOfferReminder(supabase, {
        userId: body.user_id,
        applicationId: body.application_id,
        jobTitle: body.job_title || "Your Role",
        companyName: body.company_name || "",
        deadline: body.deadline,
      });

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cron mode: scan for offers expiring within 48h
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    const { data: expiringOffers, error: offersError } = await supabase
      .from("applications")
      .select("id, position, company_name, user_id, candidate_id, offer_deadline")
      .eq("status", "offer")
      .not("offer_deadline", "is", null)
      .lte("offer_deadline", in48h)
      .gte("offer_deadline", now.toISOString());

    if (offersError) throw offersError;
    if (!expiringOffers || expiringOffers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No expiring offers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    for (const offer of expiringOffers) {
      const userId = offer.user_id || offer.candidate_id;
      if (!userId) continue;

      try {
        await sendOfferReminder(supabase, {
          userId,
          applicationId: offer.id,
          jobTitle: offer.position,
          companyName: offer.company_name,
          deadline: offer.offer_deadline,
        });
        sentCount++;
      } catch (err) {
        console.error(`[offer-deadline] Error for ${offer.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[offer-deadline] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendOfferReminder(
  supabase: any,
  opts: {
    userId: string;
    applicationId: string;
    jobTitle: string;
    companyName: string;
    deadline?: string;
  }
) {
  const deadlineDate = opts.deadline ? new Date(opts.deadline) : null;
  const hoursLeft = deadlineDate
    ? Math.max(0, Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  const deadlineStr = deadlineDate
    ? deadlineDate.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
      })
    : "soon";

  const body = hoursLeft !== null
    ? `Your offer for ${opts.jobTitle}${opts.companyName ? ` at ${opts.companyName}` : ""} expires in ${hoursLeft} hours (${deadlineStr} CET). Please respond before the deadline.`
    : `Your offer for ${opts.jobTitle}${opts.companyName ? ` at ${opts.companyName}` : ""} is expiring ${deadlineStr}. Please respond promptly.`;

  const emailHtml = buildOfferDeadlineEmail({
    jobTitle: opts.jobTitle,
    companyName: opts.companyName,
    deadline: deadlineStr,
    hoursLeft,
    applicationId: opts.applicationId,
  });

  const { data, error } = await supabase.functions.invoke("send-candidate-notification", {
    body: {
      user_id: opts.userId,
      event_type: "offer_deadline",
      event_id: `offer-deadline-${opts.applicationId}-${hoursLeft || "soon"}`,
      payload: {
        title: "Offer Expiring Soon",
        body,
        email_html: emailHtml,
        route: `/applications/${opts.applicationId}`,
        data: {
          applicationId: opts.applicationId,
          jobTitle: opts.jobTitle,
          companyName: opts.companyName,
          hoursLeft,
        },
      },
    },
  });

  if (error) throw error;
  return { success: true, data };
}

function buildOfferDeadlineEmail(opts: {
  jobTitle: string;
  companyName: string;
  deadline: string;
  hoursLeft: number | null;
  applicationId: string;
}): string {
  const urgencyColor = (opts.hoursLeft !== null && opts.hoursLeft <= 12) ? "#dc2626" : "#C9A24E";

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
          <h1 style="margin:0 0 8px;font-size:22px;color:${urgencyColor};">Offer Expiring Soon</h1>
          <p style="margin:0 0 8px;font-size:18px;color:#F5F4EF;font-weight:600;">${opts.jobTitle}</p>
          ${opts.companyName ? `<p style="margin:0 0 16px;font-size:14px;color:#999;">at ${opts.companyName}</p>` : ""}
          ${opts.hoursLeft !== null ? `
          <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="background-color:#2a2a2d;border-radius:6px;padding:16px 24px;text-align:center;">
              <span style="font-size:32px;font-weight:700;color:${urgencyColor};">${opts.hoursLeft}h</span>
              <br/><span style="font-size:12px;color:#999;">remaining</span>
            </td></tr>
          </table>` : ""}
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#F5F4EF;">
            Your offer deadline is ${opts.deadline} CET. Please review and respond before it expires.
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background-color:${urgencyColor};border-radius:6px;padding:12px 28px;">
              <a href="https://thequantumclub.lovable.app/applications/${opts.applicationId}" style="color:${(opts.hoursLeft !== null && opts.hoursLeft <= 12) ? "#fff" : "#0E0E10"};text-decoration:none;font-weight:600;font-size:14px;">
                Review Offer
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