import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Weekly digest email for candidates. Run via pg_cron every Monday at 9am CET.
 * Summarizes: new job matches, application updates, upcoming meetings, profile tips.
 *
 * Body: { user_id? } — if user_id provided, sends to that user only (testing).
 *       Otherwise, sends to all users with email_digest enabled.
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
    const targetUserId = body.user_id;

    // Get users who want the digest
    let usersQuery = supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("email_digest", true)
      .eq("email_enabled", true);

    if (targetUserId) {
      usersQuery = supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("user_id", targetUserId);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No digest recipients" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let sentCount = 0;
    let skipCount = 0;

    for (const user of users) {
      try {
        // Gather weekly data
        const [appsResult, meetingsResult, profileResult] = await Promise.all([
          supabase
            .from("applications")
            .select("id, position, company_name, status, updated_at")
            .or(`user_id.eq.${user.user_id},candidate_id.eq.${user.user_id}`)
            .gte("updated_at", oneWeekAgo)
            .order("updated_at", { ascending: false })
            .limit(10),
          supabase
            .from("meetings")
            .select("id, title, start_time, meeting_type")
            .contains("participant_ids", [user.user_id])
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(5),
          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.user_id)
            .single(),
        ]);

        const apps = appsResult.data || [];
        const meetings = meetingsResult.data || [];
        const profile = profileResult.data;

        // Skip if nothing happened this week and no upcoming meetings
        if (apps.length === 0 && meetings.length === 0) {
          skipCount++;
          continue;
        }

        const emailHtml = buildDigestEmail({
          name: profile?.full_name || "there",
          applications: apps,
          meetings,
        });

        const summaryParts: string[] = [];
        if (apps.length > 0) summaryParts.push(`${apps.length} application update${apps.length > 1 ? "s" : ""}`);
        if (meetings.length > 0) summaryParts.push(`${meetings.length} upcoming meeting${meetings.length > 1 ? "s" : ""}`);

        await supabase.functions.invoke("send-candidate-notification", {
          body: {
            user_id: user.user_id,
            event_type: "weekly_digest",
            event_id: `digest-${new Date().toISOString().split("T")[0]}`,
            payload: {
              title: "Your Weekly Summary",
              body: `This week: ${summaryParts.join(", ")}.`,
              email_html: emailHtml,
              route: "/home",
            },
            force_channels: ["email"],
          },
        });

        sentCount++;
      } catch (err) {
        console.error(`[weekly-digest] Error for user ${user.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, skipped: skipCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[weekly-digest] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildDigestEmail(opts: {
  name: string;
  applications: Array<{ position: string; company_name: string; status: string; updated_at: string }>;
  meetings: Array<{ title: string; start_time: string; meeting_type: string }>;
}): string {
  const appsHtml = opts.applications.length > 0
    ? opts.applications.map(a => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #2a2a2d;">
            <p style="margin:0;font-size:14px;color:#F5F4EF;font-weight:600;">${a.position}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#999;">${a.company_name} · ${formatStatus(a.status)}</p>
          </td>
        </tr>`).join("")
    : "";

  const meetingsHtml = opts.meetings.length > 0
    ? opts.meetings.map(m => {
        const d = new Date(m.start_time);
        const formatted = d.toLocaleDateString("en-GB", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
        });
        return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #2a2a2d;">
            <p style="margin:0;font-size:14px;color:#F5F4EF;">${m.title}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#999;">${formatted} CET</p>
          </td>
        </tr>`;
      }).join("")
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
          <h1 style="margin:0 0 4px;font-size:22px;color:#C9A24E;">Your Weekly Summary</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#999;">Hello ${opts.name}, here's what happened this week.</p>
          ${appsHtml ? `
          <h2 style="margin:0 0 12px;font-size:16px;color:#F5F4EF;">Application Updates</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${appsHtml}</table>
          ` : ""}
          ${meetingsHtml ? `
          <h2 style="margin:0 0 12px;font-size:16px;color:#F5F4EF;">Upcoming Meetings</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${meetingsHtml}</table>
          ` : ""}
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#C9A24E;border-radius:6px;padding:12px 28px;">
              <a href="https://thequantumclub.lovable.app/home" style="color:#0E0E10;text-decoration:none;font-weight:600;font-size:14px;">
                Go to Dashboard
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

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    screening: "Under Review",
    interview: "Interview Stage",
    technical_interview: "Technical Interview",
    panel_interview: "Panel Interview",
    final: "Final Stage",
    offer: "Offer Received",
    hired: "Hired",
    rejected: "Not Selected",
    withdrawn: "Withdrawn",
  };
  return map[status] || status.charAt(0).toUpperCase() + status.slice(1);
}