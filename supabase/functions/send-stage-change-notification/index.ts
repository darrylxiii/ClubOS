import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Sends multi-channel notification when an application stage changes.
 * Called by admin actions or webhooks when a candidate's application
 * moves to a new pipeline stage.
 *
 * Body: { application_id, new_status, old_status? }
 */

const statusMessages: Record<string, string> = {
  screening: "Your application is being reviewed by our team.",
  interview: "Great news — you've been selected for an interview.",
  "technical_interview": "You've been invited to a technical interview.",
  "panel_interview": "You've been invited to a panel interview.",
  final: "You've reached the final stage of the process.",
  offer: "Congratulations — you've received an offer.",
  rejected: "We appreciate your interest. Unfortunately, we won't be moving forward at this time.",
  hired: "Congratulations on your new position.",
  withdrawn: "Your application has been withdrawn.",
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

    // Fetch application with candidate info
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

    // Build email HTML
    const emailHtml = buildStageChangeEmail({
      candidateName: "", // Will be resolved by orchestrator
      position: app.position,
      companyName: app.company_name,
      newStatus: new_status,
      message,
    });

    // Delegate to orchestrator
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

function buildStageChangeEmail(opts: {
  candidateName: string;
  position: string;
  companyName: string;
  newStatus: string;
  message: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#0E0E10;color:#F5F4EF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0E0E10;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1d;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px;border-bottom:1px solid #2a2a2d;">
              <img src="https://thequantumclub.lovable.app/lovable-uploads/quantum-club-logo.png" alt="The Quantum Club" width="160" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#C9A24E;">Application Update</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#999;">
                ${opts.position} at ${opts.companyName}
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#F5F4EF;">
                ${opts.message}
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#C9A24E;border-radius:6px;padding:12px 28px;">
                    <a href="https://thequantumclub.lovable.app/applications" style="color:#0E0E10;text-decoration:none;font-weight:600;font-size:14px;">
                      View Application
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2d;font-size:12px;color:#666;">
              <p style="margin:0;">The Quantum Club</p>
              <p style="margin:4px 0 0;">Pieter Cornelisz. Hooftstraat 41-2, Amsterdam, The Netherlands</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
