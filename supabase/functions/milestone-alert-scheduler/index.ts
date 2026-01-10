import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[milestone-alert-scheduler] Starting daily milestone check...");

    // Fetch approaching milestones (90%+ progress, not yet unlocked)
    const { data: milestones, error: milestonesError } = await supabase
      .from("revenue_milestones")
      .select(`
        id,
        display_name,
        threshold_amount,
        achieved_revenue,
        progress_percentage,
        status,
        last_notification_sent_at,
        revenue_ladders (
          track_type,
          year
        )
      `)
      .eq("status", "approaching")
      .gte("progress_percentage", 90)
      .lt("progress_percentage", 100);

    if (milestonesError) {
      throw milestonesError;
    }

    if (!milestones || milestones.length === 0) {
      console.log("[milestone-alert-scheduler] No approaching milestones found");
      return new Response(
        JSON.stringify({ message: "No approaching milestones to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all team members for notifications
    const { data: teamMembers, error: teamError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true);

    if (teamError) {
      throw teamError;
    }

    const notifications: any[] = [];
    const now = new Date();

    for (const milestone of milestones) {
      // Check if we already sent a notification in the last 24 hours
      if (milestone.last_notification_sent_at) {
        const lastSent = new Date(milestone.last_notification_sent_at);
        const hoursSinceLastNotification = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastNotification < 24) {
          console.log(`[milestone-alert-scheduler] Skipping ${milestone.display_name} - notified ${hoursSinceLastNotification.toFixed(1)}h ago`);
          continue;
        }
      }

      const remaining = (milestone.threshold_amount || 0) - (milestone.achieved_revenue || 0);
      const progress = milestone.progress_percentage || 0;
      const ladder = milestone.revenue_ladders as any;

      // Create in-app notifications for all team members
      for (const member of teamMembers || []) {
        notifications.push({
          user_id: member.id,
          type: "milestone_approaching",
          title: `Almost There! ${milestone.display_name}`,
          content: `${progress.toFixed(0)}% complete - only €${remaining.toLocaleString("de-DE")} to go!`,
          action_url: "/admin/revenue-ladder",
          metadata: {
            milestone_id: milestone.id,
            progress: progress,
            remaining: remaining,
            track_type: ladder?.track_type,
            year: ladder?.year,
          },
          is_read: false,
          created_at: now.toISOString(),
        });
      }

      // Update last notification timestamp
      await supabase
        .from("revenue_milestones")
        .update({ last_notification_sent_at: now.toISOString() })
        .eq("id", milestone.id);

      console.log(`[milestone-alert-scheduler] Queued notifications for: ${milestone.display_name} (${progress.toFixed(1)}%)`);
    }

    // Batch insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("[milestone-alert-scheduler] Failed to insert notifications:", insertError);
      } else {
        console.log(`[milestone-alert-scheduler] Created ${notifications.length} notifications`);
      }

      // Trigger push notifications if available
      try {
        const userIds = [...new Set(notifications.map((n) => n.user_id))];
        await supabase.functions.invoke("send-push-notification", {
          body: {
            target_user_ids: userIds,
            notification_type: "milestone_approaching",
            title: "Revenue Milestone Approaching!",
            body: `You're so close to unlocking the next milestone`,
            route: "/admin/revenue-ladder",
          },
        });
      } catch (pushError) {
        console.log("[milestone-alert-scheduler] Push notification skipped:", pushError);
      }
    }

    // Also check for newly unlocked milestones that haven't been celebrated
    const { data: unlockedMilestones, error: unlockedError } = await supabase
      .from("revenue_milestones")
      .select("id, display_name, achieved_revenue, threshold_amount")
      .eq("status", "unlocked")
      .is("last_notification_sent_at", null);

    if (!unlockedError && unlockedMilestones && unlockedMilestones.length > 0) {
      const unlockNotifications: any[] = [];

      for (const milestone of unlockedMilestones) {
        for (const member of teamMembers || []) {
          unlockNotifications.push({
            user_id: member.id,
            type: "milestone_unlocked",
            title: `🎉 Milestone Unlocked: ${milestone.display_name}`,
            content: `Team achieved €${(milestone.achieved_revenue || 0).toLocaleString("de-DE")}!`,
            action_url: "/admin/revenue-ladder",
            metadata: {
              milestone_id: milestone.id,
              achieved_revenue: milestone.achieved_revenue,
            },
            is_read: false,
            created_at: now.toISOString(),
          });
        }

        await supabase
          .from("revenue_milestones")
          .update({ last_notification_sent_at: now.toISOString() })
          .eq("id", milestone.id);
      }

      if (unlockNotifications.length > 0) {
        await supabase.from("notifications").insert(unlockNotifications);
        console.log(`[milestone-alert-scheduler] Created ${unlockNotifications.length} unlock notifications`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        approaching_notifications: notifications.length,
        milestones_processed: milestones.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[milestone-alert-scheduler] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
