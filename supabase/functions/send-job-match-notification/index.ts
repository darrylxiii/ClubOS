import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, Spacer, Divider } from "../_shared/email-templates/components.ts";
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

    const appUrl = getEmailAppUrl();

    const reasonsHtml = reasons.length > 0
      ? reasons.map((r: string) => InfoRow({ label: '✓', value: r })).join('')
      : '';

    const content = `
      ${Heading({ text: 'New Job Match', level: 1 })}
      ${Paragraph(`We found a role that aligns with your profile and preferences.`)}
      ${Spacer(8)}
      ${Card({
        content: `
          ${Heading({ text: job_title, level: 2 })}
          ${InfoRow({ label: 'Company', value: company_name || 'A Leading Company' })}
          ${InfoRow({ label: 'Match Score', value: `${score}%` })}
        `,
        variant: 'highlight',
      })}
      ${reasons.length > 0 ? `
        ${Spacer(16)}
        ${Heading({ text: 'Why this matches', level: 3 })}
        ${reasonsHtml}
      ` : ''}
      ${Spacer(16)}
      <div style="text-align: center;">
        ${Button({ url: `${appUrl}/jobs/${job_id}`, text: 'View Role' })}
      </div>
    `;

    const emailHtml = baseEmailTemplate({
      preheader: `New match: ${job_title} at ${company_name || 'a leading company'} — ${score}% match`,
      content,
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
