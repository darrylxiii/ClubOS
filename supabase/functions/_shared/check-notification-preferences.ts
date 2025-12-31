// Shared utility to check notification preferences across all channels
// Used by all notification edge functions for consistent preference handling

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  preferred_channel: string | null;
  new_messages: boolean;
  interview_reminders: boolean;
  application_updates: boolean;
  meeting_reminders: boolean;
  job_matches: boolean;
  system_announcements: boolean;
  booking_confirmations: boolean;
  booking_reminders: boolean;
  booking_approvals: boolean;
}

export type NotificationType = 
  | 'new_message' 
  | 'interview_reminder' 
  | 'application_update' 
  | 'meeting_reminder' 
  | 'job_match' 
  | 'system'
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_approval'
  | 'booking_pending';

export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app';

const TYPE_TO_FIELD: Record<NotificationType, keyof NotificationPreferences> = {
  'new_message': 'new_messages',
  'interview_reminder': 'interview_reminders',
  'application_update': 'application_updates',
  'meeting_reminder': 'meeting_reminders',
  'job_match': 'job_matches',
  'system': 'system_announcements',
  'booking_confirmation': 'booking_confirmations',
  'booking_reminder': 'booking_reminders',
  'booking_approval': 'booking_approvals',
  'booking_pending': 'booking_approvals', // Same preference as approvals
};

const CHANNEL_TO_FIELD: Record<NotificationChannel, keyof NotificationPreferences> = {
  'email': 'email_enabled',
  'push': 'push_enabled',
  'sms': 'sms_enabled',
  'in_app': 'in_app_enabled',
};

export async function getNotificationPreferences(
  supabase: any,
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.log(`[Preferences] No preferences found for user ${userId}, using defaults`);
    return null;
  }

  return data as NotificationPreferences;
}

export function isInQuietHours(preferences: NotificationPreferences | null): boolean {
  if (!preferences?.quiet_hours_start || !preferences?.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (preferences.quiet_hours_start > preferences.quiet_hours_end) {
    return currentTime >= preferences.quiet_hours_start || currentTime <= preferences.quiet_hours_end;
  }
  
  return currentTime >= preferences.quiet_hours_start && currentTime <= preferences.quiet_hours_end;
}

export function shouldSendNotification(
  preferences: NotificationPreferences | null,
  channel: NotificationChannel,
  type: NotificationType
): { shouldSend: boolean; reason?: string } {
  // Default to enabled if no preferences exist
  if (!preferences) {
    return { shouldSend: true };
  }

  // Check quiet hours first (applies to all channels except system)
  if (type !== 'system' && isInQuietHours(preferences)) {
    return { shouldSend: false, reason: 'quiet_hours' };
  }

  // Check if channel is enabled
  const channelField = CHANNEL_TO_FIELD[channel];
  if (preferences[channelField] === false) {
    return { shouldSend: false, reason: `${channel}_disabled` };
  }

  // Check if notification type is enabled
  const typeField = TYPE_TO_FIELD[type];
  if (typeField && preferences[typeField] === false) {
    return { shouldSend: false, reason: `${type}_disabled` };
  }

  return { shouldSend: true };
}

export async function checkAndSend(
  supabase: any,
  userId: string,
  channel: NotificationChannel,
  type: NotificationType,
  sendFn: () => Promise<void>
): Promise<{ sent: boolean; reason?: string }> {
  const preferences = await getNotificationPreferences(supabase, userId);
  const { shouldSend, reason } = shouldSendNotification(preferences, channel, type);

  if (!shouldSend) {
    console.log(`[Preferences] Skipping ${channel} notification for user ${userId}: ${reason}`);
    return { sent: false, reason };
  }

  try {
    await sendFn();
    return { sent: true };
  } catch (error) {
    console.error(`[Preferences] Failed to send ${channel} notification:`, error);
    throw error;
  }
}

export async function createInAppNotification(
  supabase: any,
  userId: string,
  type: NotificationType,
  title: string,
  content: string | null,
  actionUrl: string | null = null,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    const preferences = await getNotificationPreferences(supabase, userId);
    const { shouldSend, reason } = shouldSendNotification(preferences, 'in_app', type);

    if (!shouldSend) {
      console.log(`[InApp] Skipping notification for user ${userId}: ${reason}`);
      return false;
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        content,
        action_url: actionUrl,
        metadata,
        is_read: false,
      });

    if (error) {
      console.error('[InApp] Failed to create notification:', error);
      return false;
    }

    console.log(`[InApp] Created notification for user ${userId}: ${title}`);
    return true;
  } catch (error) {
    console.error('[InApp] Error creating notification:', error);
    return false;
  }
}
