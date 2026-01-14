import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[crm-activity-reminder] Starting activity reminder check');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // 1. Find overdue activities
    const { data: overdueActivities, error: overdueError } = await supabase
      .from('crm_activities')
      .select(`
        *,
        prospect:crm_prospects(id, full_name, email, company_name),
        assigned_to_profile:profiles!crm_activities_assigned_to_fkey(id, full_name, email)
      `)
      .eq('status', 'pending')
      .lt('due_date', todayStart.toISOString())
      .order('due_date', { ascending: true });

    if (overdueError) {
      console.error('[crm-activity-reminder] Error fetching overdue activities:', overdueError);
    }

    console.log(`[crm-activity-reminder] Found ${overdueActivities?.length || 0} overdue activities`);

    // 2. Find activities due today
    const { data: todayActivities, error: todayError } = await supabase
      .from('crm_activities')
      .select(`
        *,
        prospect:crm_prospects(id, full_name, email, company_name),
        assigned_to_profile:profiles!crm_activities_assigned_to_fkey(id, full_name, email)
      `)
      .eq('status', 'pending')
      .gte('due_date', todayStart.toISOString())
      .lt('due_date', todayEnd.toISOString())
      .order('due_date', { ascending: true });

    if (todayError) {
      console.error('[crm-activity-reminder] Error fetching today activities:', todayError);
    }

    console.log(`[crm-activity-reminder] Found ${todayActivities?.length || 0} activities due today`);

    // 3. Find rotting prospects (no activity in 7+ days for active stages)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: rottingProspects, error: rottingError } = await supabase
      .from('crm_prospects')
      .select('*')
      .in('stage', ['new', 'contacted', 'replied', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation'])
      .lt('last_activity_at', sevenDaysAgo.toISOString())
      .order('last_activity_at', { ascending: true });

    if (rottingError) {
      console.error('[crm-activity-reminder] Error fetching rotting prospects:', rottingError);
    }

    console.log(`[crm-activity-reminder] Found ${rottingProspects?.length || 0} rotting prospects`);

    // Group activities by assigned user for notifications
    const userNotifications: Record<string, {
      overdue: any[];
      today: any[];
      rotting: any[];
    }> = {};

    // Process overdue activities
    for (const activity of overdueActivities || []) {
      const userId = activity.assigned_to;
      if (!userId) continue;

      if (!userNotifications[userId]) {
        userNotifications[userId] = { overdue: [], today: [], rotting: [] };
      }
      userNotifications[userId].overdue.push(activity);
    }

    // Process today's activities
    for (const activity of todayActivities || []) {
      const userId = activity.assigned_to;
      if (!userId) continue;

      if (!userNotifications[userId]) {
        userNotifications[userId] = { overdue: [], today: [], rotting: [] };
      }
      userNotifications[userId].today.push(activity);
    }

    // Process rotting prospects (assign to owner or default strategist)
    for (const prospect of rottingProspects || []) {
      const userId = prospect.assigned_to || prospect.created_by;
      if (!userId) continue;

      if (!userNotifications[userId]) {
        userNotifications[userId] = { overdue: [], today: [], rotting: [] };
      }
      userNotifications[userId].rotting.push(prospect);
    }

    // Create in-app notifications for each user
    const notificationResults = [];
    for (const [userId, data] of Object.entries(userNotifications)) {
      const totalItems = data.overdue.length + data.today.length + data.rotting.length;
      
      if (totalItems === 0) continue;

      // Create notification
      const notificationContent = [];
      if (data.overdue.length > 0) {
        notificationContent.push(`${data.overdue.length} overdue activities`);
      }
      if (data.today.length > 0) {
        notificationContent.push(`${data.today.length} activities due today`);
      }
      if (data.rotting.length > 0) {
        notificationContent.push(`${data.rotting.length} prospects need attention`);
      }

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'crm_activity_reminder',
          title: 'CRM Activity Reminder',
          message: notificationContent.join(', '),
          data: {
            overdue_count: data.overdue.length,
            today_count: data.today.length,
            rotting_count: data.rotting.length,
            overdue_ids: data.overdue.map(a => a.id),
            today_ids: data.today.map(a => a.id),
            rotting_ids: data.rotting.map(p => p.id),
          },
          is_read: false,
          created_at: new Date().toISOString(),
        });

      if (notifError) {
        console.error(`[crm-activity-reminder] Error creating notification for user ${userId}:`, notifError);
        notificationResults.push({ user_id: userId, status: 'error', error: notifError.message });
      } else {
        console.log(`[crm-activity-reminder] Created notification for user ${userId}`);
        notificationResults.push({ user_id: userId, status: 'success', counts: data });
      }
    }

    // Update rotting prospect flags
    if (rottingProspects && rottingProspects.length > 0) {
      const rottingIds = rottingProspects.map(p => p.id);
      await supabase
        .from('crm_prospects')
        .update({ is_rotting: true, updated_at: new Date().toISOString() })
        .in('id', rottingIds);
    }

    console.log('[crm-activity-reminder] Reminder check complete', {
      overdue_count: overdueActivities?.length || 0,
      today_count: todayActivities?.length || 0,
      rotting_count: rottingProspects?.length || 0,
      notifications_sent: notificationResults.filter(r => r.status === 'success').length,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          overdue_activities: overdueActivities?.length || 0,
          today_activities: todayActivities?.length || 0,
          rotting_prospects: rottingProspects?.length || 0,
          users_notified: notificationResults.filter(r => r.status === 'success').length,
        },
        notifications: notificationResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[crm-activity-reminder] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
