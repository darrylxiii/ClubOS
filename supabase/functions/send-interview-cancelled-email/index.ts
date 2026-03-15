import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, StatusBadge, Spacer } from "../_shared/email-templates/components.ts";
import { getEmailAppUrl } from "../_shared/email-config.ts";

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
    const appUrl = getEmailAppUrl();

    let bodyText: string;
    let newTimeFormatted = "";
    if (isCancelled) {
      bodyText = `Your interview for ${job_title || "a role"} at ${company_name || "a company"} has been cancelled.`;
      if (reason) bodyText += ` Reason: ${reason}`;
    } else {
      bodyText = `Your interview for ${job_title || "a role"} at ${company_name || "a company"} has been rescheduled.`;
      if (new_time) {
        const date = new Date(new_time);
        newTimeFormatted = date.toLocaleDateString("en-GB", {
          weekday: "long", day: "numeric", month: "long",
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
        });
        bodyText += ` New time: ${newTimeFormatted} (CET).`;
      }
    }

    const content = `
      ${StatusBadge({ status: isCancelled ? 'cancelled' : 'pending', text: isCancelled ? 'CANCELLED' : 'RESCHEDULED' })}
      ${Heading({ text: title, level: 1 })}
      ${Spacer(8)}
      ${Card({
        content: `
          ${InfoRow({ label: 'Role', value: job_title || 'Your Interview' })}
          ${company_name ? InfoRow({ label: 'Company', value: company_name }) : ''}
          ${newTimeFormatted ? InfoRow({ label: 'New Time', value: `${newTimeFormatted} (CET)` }) : ''}
          ${reason ? InfoRow({ label: 'Reason', value: reason }) : ''}
        `,
        variant: isCancelled ? 'warning' : 'default',
      })}
      ${Spacer(16)}
      ${Paragraph(bodyText)}
      ${Spacer(16)}
      <div style="text-align: center;">
        ${Button({ url: `${appUrl}/meetings`, text: isCancelled ? 'View Details' : 'View Updated Schedule' })}
      </div>
    `;

    const emailHtml = baseEmailTemplate({
      preheader: bodyText,
      content,
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
            body: bodyText,
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
