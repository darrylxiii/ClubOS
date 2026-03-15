import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, StatusBadge, Spacer, AlertBox } from "../_shared/email-templates/components.ts";
import { getEmailAppUrl, EMAIL_COLORS } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));

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

  const bodyText = hoursLeft !== null
    ? `Your offer for ${opts.jobTitle}${opts.companyName ? ` at ${opts.companyName}` : ""} expires in ${hoursLeft} hours (${deadlineStr} CET). Please respond before the deadline.`
    : `Your offer for ${opts.jobTitle}${opts.companyName ? ` at ${opts.companyName}` : ""} is expiring ${deadlineStr}. Please respond promptly.`;

  const appUrl = getEmailAppUrl();
  const isUrgent = hoursLeft !== null && hoursLeft <= 12;

  const content = `
    ${StatusBadge({ status: 'reminder', text: isUrgent ? 'URGENT' : 'REMINDER' })}
    ${Heading({ text: 'Offer Expiring Soon', level: 1 })}
    ${Spacer(8)}
    ${Card({
      content: `
        ${InfoRow({ label: 'Position', value: opts.jobTitle })}
        ${opts.companyName ? InfoRow({ label: 'Company', value: opts.companyName }) : ''}
        ${InfoRow({ label: 'Deadline', value: `${deadlineStr} CET` })}
        ${hoursLeft !== null ? InfoRow({ label: 'Time Remaining', value: `${hoursLeft} hours` }) : ''}
      `,
      variant: isUrgent ? 'warning' : 'highlight',
    })}
    ${Spacer(16)}
    ${isUrgent ? AlertBox({
      type: 'warning',
      title: 'Action Required',
      message: 'This offer expires in less than 12 hours. Please review and respond as soon as possible.',
    }) : ''}
    ${Paragraph(bodyText)}
    ${Spacer(16)}
    <div style="text-align: center;">
      ${Button({ url: `${appUrl}/applications/${opts.applicationId}`, text: 'Review Offer' })}
    </div>
  `;

  const emailHtml = baseEmailTemplate({
    preheader: `Offer expiring${hoursLeft !== null ? ` in ${hoursLeft}h` : ' soon'}: ${opts.jobTitle}`,
    content,
  });

  const { data, error } = await supabase.functions.invoke("send-candidate-notification", {
    body: {
      user_id: opts.userId,
      event_type: "offer_deadline",
      event_id: `offer-deadline-${opts.applicationId}-${hoursLeft || "soon"}`,
      payload: {
        title: "Offer Expiring Soon",
        body: bodyText,
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
