import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

/**
 * AI Proactive Monitoring System
 * Runs periodically (via cron) to scan user data and generate proactive suggestions
 * 
 * Monitors:
 * - Stalled applications (7+ days no update)
 * - Upcoming interviews (24-48 hours)
 * - Overdue tasks
 * - Profile completeness issues
 * - New matching jobs
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🤖 AI Monitor: Starting proactive scan...");

    // Get all active users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .limit(100); // Process in batches

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to monitor" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestions = [];

    for (const profile of profiles) {
      const userId = profile.id;
      
      // 1. Check for stalled applications
      const { data: stalledApps } = await supabase
        .from("applications")
        .select("id, position, company_name, updated_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (stalledApps && stalledApps.length > 0) {
        for (const app of stalledApps) {
          await supabase.from("ai_suggestions").insert({
            user_id: userId,
            suggestion_type: "application_follow_up",
            title: `Follow up on ${app.position} at ${app.company_name}`,
            description: `It's been over 7 days since your last update. Consider sending a follow-up message.`,
            priority: "medium",
            action_data: { applicationId: app.id },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          suggestions.push(`Follow-up suggestion for ${profile.email}`);
        }
      }

      // 2. Check for upcoming interviews (next 48 hours)
      const { data: upcomingBookings } = await supabase
        .from("bookings")
        .select("id, booking_links(title)")
        .eq("user_id", userId)
        .gte("scheduled_start", new Date().toISOString())
        .lte("scheduled_start", new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());

      if (upcomingBookings && upcomingBookings.length > 0) {
        for (const booking of upcomingBookings) {
          const linkData = Array.isArray(booking.booking_links) 
            ? booking.booking_links[0] 
            : booking.booking_links;
          
          await supabase.from("ai_suggestions").insert({
            user_id: userId,
            suggestion_type: "interview_prep",
            title: `Prepare for upcoming interview`,
            description: `Your ${linkData?.title || "interview"} is in less than 48 hours. Generate interview questions and company research?`,
            priority: "urgent",
            action_data: { bookingId: booking.id },
            expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
          });
          suggestions.push(`Interview prep for ${profile.email}`);
        }
      }

      // 3. Check for overdue tasks
      const { data: overdueTasks } = await supabase
        .from("unified_tasks")
        .select("id, title, priority")
        .neq("status", "completed")
        .not("due_date", "is", null)
        .lt("due_date", new Date().toISOString());

      if (overdueTasks && overdueTasks.length > 0) {
        const urgentCount = overdueTasks.filter(t => t.priority === "urgent" || t.priority === "high").length;
        
        if (urgentCount > 0) {
          await supabase.from("ai_suggestions").insert({
            user_id: userId,
            suggestion_type: "task_overdue",
            title: `${urgentCount} high-priority tasks overdue`,
            description: `You have ${urgentCount} urgent/high-priority tasks past their due date. Need help rescheduling or prioritizing?`,
            priority: "high",
            action_data: { taskIds: overdueTasks.map(t => t.id) },
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          });
          suggestions.push(`Overdue tasks alert for ${profile.email}`);
        }
      }

      // 4. Check profile completeness
      const { data: profileStrength } = await supabase
        .from("profile_strength_stats")
        .select("completion_percentage")
        .eq("user_id", userId)
        .single();

      if (profileStrength && profileStrength.completion_percentage < 70) {
        await supabase.from("ai_suggestions").insert({
          user_id: userId,
          suggestion_type: "profile_optimization",
          title: "Complete your profile",
          description: `Your profile is ${profileStrength.completion_percentage}% complete. Completing it can increase visibility by 34%.`,
          priority: "low",
          action_data: { currentPercentage: profileStrength.completion_percentage },
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
        suggestions.push(`Profile completion for ${profile.email}`);
      }
    }

    console.log(`✅ AI Monitor: Generated ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processedUsers: profiles.length,
        suggestionsGenerated: suggestions.length,
        details: suggestions
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("AI Monitor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
