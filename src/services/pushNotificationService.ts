import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'new_message'
  | 'interview_reminder'
  | 'application_update'
  | 'meeting_reminder'
  | 'job_match'
  | 'system';

interface SendNotificationParams {
  userId?: string;
  userIds?: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  route?: string;
}

interface NotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  message?: string;
}

/**
 * Send push notification to one or more users
 */
export async function sendPushNotification(params: SendNotificationParams): Promise<NotificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: params.userId,
        user_ids: params.userIds,
        notification_type: params.type,
        title: params.title,
        body: params.body,
        data: params.data,
        route: params.route,
      },
    });

    if (error) throw error;

    return data as NotificationResult;
  } catch (error) {
    console.error('[pushNotificationService] Failed to send notification:', error);
    return {
      success: false,
      sent: 0,
      failed: 1,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send new message notification
 */
export async function notifyNewMessage(
  recipientUserId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
): Promise<NotificationResult> {
  return sendPushNotification({
    userId: recipientUserId,
    type: 'new_message',
    title: `New message from ${senderName}`,
    body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    route: `/messages/${conversationId}`,
    data: { conversationId, senderName },
  });
}

/**
 * Send interview reminder notification
 */
export async function notifyInterviewReminder(
  userId: string,
  jobTitle: string,
  companyName: string,
  interviewTime: Date,
  meetingId: string
): Promise<NotificationResult> {
  const timeStr = interviewTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return sendPushNotification({
    userId,
    type: 'interview_reminder',
    title: 'Interview Reminder',
    body: `Your interview for ${jobTitle} at ${companyName} starts at ${timeStr}`,
    route: `/meetings/${meetingId}`,
    data: { meetingId, jobTitle, companyName },
  });
}

/**
 * Send application status update notification
 */
export async function notifyApplicationUpdate(
  userId: string,
  jobTitle: string,
  companyName: string,
  newStatus: string,
  applicationId: string
): Promise<NotificationResult> {
  const statusMessages: Record<string, string> = {
    'screening': 'Your application is being reviewed',
    'interview': 'You\'ve been selected for an interview!',
    'offer': 'Congratulations! You received an offer',
    'rejected': 'Your application was not selected',
    'hired': 'Congratulations on your new position!',
  };

  const message = statusMessages[newStatus] || `Your application status changed to ${newStatus}`;

  return sendPushNotification({
    userId,
    type: 'application_update',
    title: `${jobTitle} at ${companyName}`,
    body: message,
    route: `/applications/${applicationId}`,
    data: { applicationId, jobTitle, companyName, status: newStatus },
  });
}

/**
 * Send meeting reminder notification
 */
export async function notifyMeetingReminder(
  userIds: string[],
  meetingTitle: string,
  startTime: Date,
  meetingId: string
): Promise<NotificationResult> {
  const timeStr = startTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return sendPushNotification({
    userIds,
    type: 'meeting_reminder',
    title: 'Meeting Starting Soon',
    body: `${meetingTitle} starts at ${timeStr}`,
    route: `/meetings/${meetingId}`,
    data: { meetingId, meetingTitle },
  });
}

/**
 * Send job match notification
 */
export async function notifyJobMatch(
  userId: string,
  jobTitle: string,
  companyName: string,
  matchScore: number,
  jobId: string
): Promise<NotificationResult> {
  return sendPushNotification({
    userId,
    type: 'job_match',
    title: 'New Job Match!',
    body: `${jobTitle} at ${companyName} matches your profile (${matchScore}% match)`,
    route: `/jobs/${jobId}`,
    data: { jobId, jobTitle, companyName, matchScore },
  });
}

/**
 * Send system announcement notification
 */
export async function notifySystemAnnouncement(
  userIds: string[],
  title: string,
  body: string,
  route?: string
): Promise<NotificationResult> {
  return sendPushNotification({
    userIds,
    type: 'system',
    title,
    body,
    route,
  });
}
