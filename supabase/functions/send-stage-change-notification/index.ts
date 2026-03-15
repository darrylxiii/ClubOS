import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, StatusBadge, Spacer, Divider } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, getEmailHeaders, htmlToPlainText, getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const statusMessages: Record<string, string> = {
  screening: "Your application is being reviewed by our team.",
  interview: "Great news — you've been selected for an interview.",
  technical_interview: "You've been invited to a technical interview.",
  panel_interview: "You've been invited to a panel interview.",
  final: "You've reached the final stage of the process.",
  offer: "Congratulations — you've received an offer.",
  rejected: "We appreciate your interest. Unfortunately, we won't be moving forward at this time.",
  hired: "Congratulations on your new position.",
  withdrawn: "Your application has been withdrawn.",
};

const statusBadgeMap: Record<string, 'confirmed' | 'pending' | 'cancelled' | 'new'> = {
  screening: 'pending',
  interview: 'confirmed',
  technical_interview: 'confirmed',
  panel_interview: 'confirmed',
  final: 'confirmed',
  offer: 'new',
  rejected: 'cancelled',
  hired: 'confirmed',
  withdrawn: 'cancelled',
};

const statusLabels: Record<string, string> = {
  screening: 'UNDER REVIEW',
  interview: 'INTERVIEW',
  technical_interview: 'TECHNICAL INTERVIEW',
  panel_interview: 'PANEL INTERVIEW',
  final: 'FINAL STAGE',
  offer: 'OFFER RECEIVED',
  rejected: 'NOT SELECTED',
  hired: 'HIRED',
  withdrawn: 'WITHDRAWN',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { application_id, new_status, old_status } = await req.json();

    if (!application_id || !new_status) {
      return new Response(
        JSON.stringify({ error: "application_id and new_status required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, position, company_name, user_id, candidate_id, status")
      .eq("id", application_id)
      .single();

    if (appError || !app) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = app.user_id || app.candidate_id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "No user associated with application" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = statusMessages[new_status] || `Your application status changed to ${new_status}.`;
    const title = `${app.position} at ${app.company_name}`;
    const appUrl = getEmailAppUrl();

    const badgeType = statusBadgeMap[new_status] || 'pending';
    const badgeLabel = statusLabels[new_status] || new_status.toUpperCase();

    const content = `
      ${StatusBadge({ status: badgeType, text: badgeLabel })}
      ${Heading({ text: 'Application Update', level: 1 })}
      ${Spacer(8)}
      ${Card({
        content: `
          ${InfoRow({ label: 'Position', value: app.position || 'N/A' })}
          ${InfoRow({ label: 'Company', value: app.company_name || 'N/A' })}
        `,
        variant: 'default',
      })}
      ${Spacer(16)}
      ${Paragraph(message)}
      ${Spacer(16)}
      <div style="text-align: center;">
        ${Button({ url: `${appUrl}/applications/${application_id}`, text: 'View Application' })}
      </div>
    `;

    const emailHtml = baseEmailTemplate({
      preheader: `${title} — ${message}`,
      content,
    });

    const { data: result, error: invokeError } = await supabase.functions.invoke(
      "send-candidate-notification",
      {
        body: {
          user_id: userId,
          event_type: "application_stage_change",
          event_id: `${application_id}-${new_status}`,
          payload: {
            title,
            body: message,
            email_html: emailHtml,
            route: `/applications/${application_id}`,
            data: {
              applicationId: application_id,
              oldStatus: old_status,
              newStatus: new_status,
              position: app.position,
              companyName: app.company_name,
            },
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
    console.error("[stage-change] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
