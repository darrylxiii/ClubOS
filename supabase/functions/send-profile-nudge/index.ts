import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Card, Button, InfoRow, Spacer, AlertBox } from "../_shared/email-templates/components.ts";
import { getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROFILE_FIELDS = [
  "full_name", "avatar_url", "headline", "location", "phone",
] as const;

const CANDIDATE_FIELDS = [
  "skills", "desired_role", "work_authorization", "preferred_industries", "resume_url",
] as const;

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

    let query = supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, headline, location, phone, user_type, created_at")
      .eq("user_type", "candidate");

    if (targetUserId) {
      query = query.eq("id", targetUserId);
    }

    const { data: profiles, error: profilesError } = await query.limit(200);
    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No candidates found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = profiles.map(p => p.id);
    const { data: candidateProfiles } = await supabase
      .from("candidate_profiles")
      .select("user_id, skills, desired_role, work_authorization, preferred_industries, resume_url")
      .in("user_id", userIds);

    const cpMap = new Map((candidateProfiles || []).map(cp => [cp.user_id, cp]));

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNudges } = await supabase
      .from("notification_delivery_log")
      .select("user_id")
      .eq("event_type", "profile_nudge")
      .gte("created_at", oneWeekAgo);

    const recentlyNudgedSet = new Set((recentNudges || []).map(n => n.user_id));

    let sentCount = 0;
    const appUrl = getEmailAppUrl();

    for (const profile of profiles) {
      if (recentlyNudgedSet.has(profile.id)) continue;

      const cp = cpMap.get(profile.id);
      const missing: string[] = [];

      if (!profile.avatar_url) missing.push("Profile photo");
      if (!profile.headline) missing.push("Headline");
      if (!profile.location) missing.push("Location");
      if (!profile.phone) missing.push("Phone number");

      if (!cp?.skills || (Array.isArray(cp.skills) && cp.skills.length === 0)) missing.push("Skills");
      if (!cp?.desired_role) missing.push("Desired role");
      if (!cp?.work_authorization) missing.push("Work authorization");
      if (!cp?.resume_url) missing.push("Resume");

      const totalFields = PROFILE_FIELDS.length + CANDIDATE_FIELDS.length;
      const completedFields = totalFields - missing.length;
      const completionPct = Math.round((completedFields / totalFields) * 100);

      if (completionPct >= 80) continue;

      const topMissing = missing.slice(0, 3);
      const nudgeBody = `Your profile is ${completionPct}% complete. Adding your ${topMissing.join(", ").toLowerCase()} will improve your match quality.`;

      const missingFieldsHtml = topMissing.map(f => InfoRow({ label: '○', value: f })).join('');

      const content = `
        ${Heading({ text: 'Complete Your Profile', level: 1 })}
        ${Paragraph(`Hello ${profile.full_name || 'there'}, your profile is currently ${completionPct}% complete.`)}
        ${Spacer(8)}
        ${Card({
          content: `
            <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #0E0E10;">Consider adding:</p>
            ${missingFieldsHtml}
          `,
          variant: 'highlight',
        })}
        ${Spacer(16)}
        ${AlertBox({
          type: 'info',
          message: 'Complete profiles receive significantly more relevant matches and faster recruiter responses.',
        })}
        ${Spacer(16)}
        <div style="text-align: center;">
          ${Button({ url: `${appUrl}/settings?tab=profile`, text: 'Complete Profile' })}
        </div>
      `;

      const emailHtml = baseEmailTemplate({
        preheader: `Your profile is ${completionPct}% complete — add ${topMissing[0]?.toLowerCase()} to improve matches`,
        content,
      });

      try {
        await supabase.functions.invoke("send-candidate-notification", {
          body: {
            user_id: profile.id,
            event_type: "profile_nudge",
            event_id: `nudge-${new Date().toISOString().split("T")[0]}`,
            payload: {
              title: "Complete Your Profile",
              body: nudgeBody,
              email_html: emailHtml,
              route: "/settings?tab=profile",
            },
          },
        });
        sentCount++;
      } catch (err) {
        console.error(`[profile-nudge] Error for user ${profile.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[profile-nudge] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
