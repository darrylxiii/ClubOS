import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, Spacer, Divider } from "../_shared/email-templates/components.ts";
import { getEmailAppUrl, EMAIL_COLORS } from "../_shared/email-config.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id;

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
    const appUrl = getEmailAppUrl();

    for (const user of users) {
      try {
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

        if (apps.length === 0 && meetings.length === 0) {
          skipCount++;
          continue;
        }

        const name = profile?.full_name || "there";

        // Build application rows
        const appsContentHtml = apps.map(a => {
          return `
            ${InfoRow({ label: a.position || 'Role', value: `${a.company_name || ''} · ${formatStatus(a.status)}` })}
          `;
        }).join('');

        // Build meeting rows
        const meetingsContentHtml = meetings.map(m => {
          const d = new Date(m.start_time);
          const formatted = d.toLocaleDateString("en-GB", {
            weekday: "short", day: "numeric", month: "short",
            hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
          });
          return InfoRow({ label: m.title || 'Meeting', value: `${formatted} CET` });
        }).join('');

        const content = `
          ${Heading({ text: 'Your Weekly Summary', level: 1 })}
          ${Paragraph(`Hello ${name}, here is what happened this week.`)}
          ${apps.length > 0 ? `
            ${Spacer(8)}
            ${Heading({ text: 'Application Updates', level: 2 })}
            ${Card({ content: appsContentHtml, variant: 'default' })}
          ` : ''}
          ${meetings.length > 0 ? `
            ${Spacer(16)}
            ${Heading({ text: 'Upcoming Meetings', level: 2 })}
            ${Card({ content: meetingsContentHtml, variant: 'default' })}
          ` : ''}
          ${Spacer(24)}
          <div style="text-align: center;">
            ${Button({ url: `${appUrl}/home`, text: 'Go to Dashboard' })}
          </div>
        `;

        const emailHtml = baseEmailTemplate({
          preheader: `Your weekly summary — ${apps.length} update${apps.length !== 1 ? 's' : ''}, ${meetings.length} upcoming meeting${meetings.length !== 1 ? 's' : ''}`,
          content,
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
