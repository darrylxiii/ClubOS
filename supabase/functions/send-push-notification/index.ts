import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_id?: string;
  user_ids?: string[];
  notification_type: 'new_message' | 'interview_reminder' | 'application_update' | 'meeting_reminder' | 'job_match' | 'system' | 'booking_confirmation' | 'booking_reminder' | 'booking_approval';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  route?: string;
  create_in_app?: boolean; // Whether to also create an in-app notification (default: true)
}

interface NotificationPref {
  user_id: string;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  new_messages?: boolean;
  interview_reminders?: boolean;
  application_updates?: boolean;
  meeting_reminders?: boolean;
  job_matches?: boolean;
  system_announcements?: boolean;
  [key: string]: string | boolean | null | undefined;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushNotificationRequest = await req.json();
    console.log('[send-push-notification] Received request:', JSON.stringify(payload));

    const { user_id, user_ids, notification_type, title, body, data, route, create_in_app = true } = payload;

    if (!title || !notification_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, notification_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user IDs
    const targetUserIds = user_ids || (user_id ? [user_id] : []);
    
    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push-notification] Sending to ${targetUserIds.length} users`);

    // Check notification preferences and get device tokens
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_id', targetUserIds);

    if (prefError) {
      console.error('[send-push-notification] Error fetching preferences:', prefError);
    }

    // Create a map of user preferences
    const userPrefs = new Map<string, NotificationPref>(
      (preferences as NotificationPref[] | null)?.map(p => [p.user_id, p]) || []
    );

    // Filter users based on preferences and quiet hours
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    const eligibleUserIds = targetUserIds.filter(userId => {
      const pref = userPrefs.get(userId);
      
      // If no preferences exist, default to enabled
      if (!pref) return true;
      
      // Check if push is enabled
      if (!pref.push_enabled) {
        console.log(`[send-push-notification] Push disabled for user ${userId}`);
        return false;
      }

      // Check quiet hours
      if (pref.quiet_hours_start && pref.quiet_hours_end) {
        if (currentTime >= pref.quiet_hours_start && currentTime <= pref.quiet_hours_end) {
          console.log(`[send-push-notification] User ${userId} in quiet hours`);
          return false;
        }
      }

      // Check notification type preference
      const typeField = getNotificationTypeField(notification_type);
      if (typeField && pref[typeField] === false) {
        console.log(`[send-push-notification] ${notification_type} disabled for user ${userId}`);
        return false;
      }

      return true;
    });

    console.log(`[send-push-notification] ${eligibleUserIds.length} eligible users after filtering`);

    if (eligibleUserIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No eligible users to notify',
          sent: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device tokens for eligible users
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('id, user_id, token, platform')
      .in('user_id', eligibleUserIds)
      .eq('is_active', true);

    if (tokenError) {
      console.error('[send-push-notification] Error fetching tokens:', tokenError);
      throw tokenError;
    }

    console.log(`[send-push-notification] Found ${tokens?.length || 0} device tokens`);

    // Create in-app notifications for eligible users (mirrors push notifications)
    if (create_in_app) {
      console.log(`[send-push-notification] Creating in-app notifications for ${eligibleUserIds.length} users`);
      
      const inAppNotifications = eligibleUserIds.map(userId => ({
        user_id: userId,
        type: notification_type,
        title,
        content: body,
        action_url: route || null,
        metadata: data || {},
        is_read: false,
      }));
      
      const { error: inAppError } = await supabase
        .from('notifications')
        .insert(inAppNotifications);
      
      if (inAppError) {
        console.error('[send-push-notification] Failed to create in-app notifications:', inAppError);
      } else {
        console.log(`[send-push-notification] Created ${eligibleUserIds.length} in-app notifications`);
      }
    }

    if (!tokens || tokens.length === 0) {
      // Log the notification attempt even without tokens
      await logNotifications(supabase, eligibleUserIds, notification_type, title, body, data, 'no_tokens');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No device tokens registered, in-app notifications created',
          sent: 0,
          in_app_created: create_in_app ? eligibleUserIds.length : 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          await sendPushNotification(
            token.token,
            token.platform,
            title,
            body,
            { ...data, route },
            fcmServerKey
          );
          
          // Log successful send
          await supabase.from('notification_logs').insert({
            user_id: token.user_id,
            notification_type,
            title,
            body,
            data: { ...data, route },
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          return { success: true, token_id: token.id };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error(`[send-push-notification] Failed to send to token ${token.id}:`, error);
          
          // Log failed send
          await supabase.from('notification_logs').insert({
            user_id: token.user_id,
            notification_type,
            title,
            body,
            data: { ...data, route },
            status: 'failed',
            error_message: error.message,
          });

          // Mark token as inactive if it's invalid
          if (isInvalidTokenError(error)) {
            await supabase
              .from('device_tokens')
              .update({ is_active: false })
              .eq('id', token.id);
          }

          return { success: false, token_id: token.id, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[send-push-notification] Sent: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[send-push-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getNotificationTypeField(type: string): string | null {
  const mapping: Record<string, string> = {
    'new_message': 'new_messages',
    'interview_reminder': 'interview_reminders',
    'application_update': 'application_updates',
    'meeting_reminder': 'meeting_reminders',
    'job_match': 'job_matches',
    'system': 'system_announcements',
    'booking_confirmation': 'booking_confirmations',
    'booking_reminder': 'booking_reminders',
    'booking_approval': 'booking_approvals',
  };
  return mapping[type] || null;
}

async function sendPushNotification(
  token: string,
  platform: string,
  title: string,
  body: string,
  data: Record<string, unknown> | undefined,
  fcmServerKey: string | undefined
): Promise<void> {
  // For web push, use Web Push API
  if (platform === 'web') {
    console.log('[send-push-notification] Web push not yet implemented');
    return;
  }

  // For iOS/Android, use FCM
  if (!fcmServerKey) {
    console.log('[send-push-notification] FCM server key not configured');
    return;
  }

  const message = {
    to: token,
    notification: {
      title,
      body,
      sound: 'default',
      badge: 1,
    },
    data: data || {},
    priority: 'high',
  };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FCM error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.failure > 0) {
    const error = result.results?.[0]?.error;
    throw new Error(`FCM delivery failed: ${error}`);
  }
}

function isInvalidTokenError(error: Error): boolean {
  const invalidTokenErrors = [
    'InvalidRegistration',
    'NotRegistered',
    'MismatchSenderId',
  ];
  return invalidTokenErrors.some(e => error.message.includes(e));
}

async function logNotifications(
  supabase: any,
  userIds: string[],
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> | undefined,
  status: string
) {
  const logs = userIds.map(userId => ({
    user_id: userId,
    notification_type: type,
    title,
    body,
    data,
    status,
  }));

  await supabase.from('notification_logs').insert(logs);
}
