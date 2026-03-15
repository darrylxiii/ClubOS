import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Profile completion nudge. Run via pg_cron (e.g., daily at 10am CET).
 * Finds users with incomplete profiles who haven't been nudged recently
 * and sends a gentle reminder via the orchestrator.
 *
 * Body: { user_id? } — if provided, nudges that user only (for testing).
 */

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

    // Find candidates with incomplete profiles
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

    // Get candidate_profiles for these users
    const userIds = profiles.map(p => p.id);
    const { data: candidateProfiles } = await supabase
      .from("candidate_profiles")
      .select("user_id, skills, desired_role, work_authorization, preferred_industries, resume_url")
      .in("user_id", userIds);

    const cpMap = new Map((candidateProfiles || []).map(cp => [cp.user_id, cp]));

    // Check recent nudges (don't nudge more than once per week)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNudges } = await supabase
      .from("notification_delivery_log")
      .select("user_id")
      .eq("event_type", "profile_nudge")
      .gte("created_at", oneWeekAgo);

    const recentlyNudgedSet = new Set((recentNudges || []).map(n => n.user_id));

    let sentCount = 0;

    for (const profile of profiles) {
      if (recentlyNudgedSet.has(profile.id)) continue;

      const cp = cpMap.get(profile.id);
      const missing: string[] = [];

      // Check profile fields
      if (!profile.avatar_url) missing.push("profile photo");
      if (!profile.headline) missing.push("headline");
      if (!profile.location) missing.push("location");
      if (!profile.phone) missing.push("phone number");

      // Check candidate fields
      if (!cp?.skills || (Array.isArray(cp.skills) && cp.skills.length === 0)) missing.push("skills");
      if (!cp?.desired_role) missing.push("desired role");
      if (!cp?.work_authorization) missing.push("work authorization");
      if (!cp?.resume_url) missing.push("resume");

      const totalFields = PROFILE_FIELDS.length + CANDIDATE_FIELDS.length;
      const completedFields = totalFields - missing.length;
      const completionPct = Math.round((completedFields / totalFields) * 100);

      // Only nudge if below 80% complete
      if (completionPct >= 80) continue;

      const topMissing = missing.slice(0, 3);
      const nudgeBody = `Your profile is ${completionPct}% complete. Adding your ${topMissing.join(", ")} will improve your match quality.`;

      const emailHtml = buildNudgeEmail({
        name: profile.full_name || "there",
        completionPct,
        missingFields: topMissing,
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

function buildNudgeEmail(opts: {
  name: string;
  completionPct: number;
  missingFields: string[];
}): string {
  const fieldsHtml = opts.missingFields
    .map(f => `<li style="margin:4px 0;font-size:14px;color:#F5F4EF;">${f.charAt(0).toUpperCase() + f.slice(1)}</li>`)
    .join("");

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
          <h1 style="margin:0 0 8px;font-size:22px;color:#C9A24E;">Complete Your Profile</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#F5F4EF;">
            Hello ${opts.name}, your profile is currently ${opts.completionPct}% complete.
          </p>
          <p style="margin:0 0 8px;font-size:14px;color:#999;">Consider adding:</p>
          <ul style="margin:0 0 24px;padding-left:20px;">${fieldsHtml}</ul>
          <p style="margin:0 0 24px;font-size:14px;color:#999;">
            Complete profiles receive significantly more relevant matches and faster recruiter responses.
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#C9A24E;border-radius:6px;padding:12px 28px;">
              <a href="https://thequantumclub.lovable.app/settings?tab=profile" style="color:#0E0E10;text-decoration:none;font-weight:600;font-size:14px;">
                Complete Profile
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