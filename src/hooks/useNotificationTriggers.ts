import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  notifyNewMessage,
  notifyApplicationUpdate,
  notifyMeetingReminder,
} from '@/services/pushNotificationService';

/**
 * Hook that sets up real-time listeners for notification triggers.
 * This should be used in a top-level component that's always mounted.
 *
 * Fixes from audit:
 * - Application updates now use or(user_id, candidate_id) to catch admin-sourced apps
 * - Meeting reminders use notification_delivery_log (DB) instead of sessionStorage
 */
export function useNotificationTriggers() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('notification-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as Record<string, any>;

          // Don't notify for own messages
          if (message.sender_id === user.id) return;

          // Check if user is a participant in this conversation
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', message.conversation_id)
            .eq('user_id', user.id)
            .single();

          if (!participant) return;

          // Get sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', message.sender_id)
            .single();

          const senderName = sender?.full_name || 'Someone';

          await notifyNewMessage(
            user.id,
            senderName,
            message.content || 'Sent a message',
            message.conversation_id
          );
        }
      )
      .subscribe();

    // Subscribe to application updates — watch both user_id and candidate_id
    const applicationsChannel = supabase
      .channel('notification-applications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
        },
        async (payload) => {
          const oldApp = payload.old as Record<string, any>;
          const newApp = payload.new as Record<string, any>;

          // Only process if this application belongs to the current user
          const isOwner =
            newApp.user_id === user.id || newApp.candidate_id === user.id;
          if (!isOwner) return;

          // Only notify if status changed
          if (oldApp.status === newApp.status) return;

          await notifyApplicationUpdate(
            user.id,
            newApp.position,
            newApp.company_name,
            newApp.status,
            newApp.id
          );

          // Also fire the orchestrator for multi-channel delivery
          try {
            await supabase.functions.invoke('send-candidate-notification', {
              body: {
                user_id: user.id,
                event_type: 'application_stage_change',
                event_id: `${newApp.id}-${newApp.status}`,
                payload: {
                  title: `${newApp.position} at ${newApp.company_name}`,
                  body: `Your application status changed to ${newApp.status}`,
                  route: `/applications/${newApp.id}`,
                  data: {
                    applicationId: newApp.id,
                    status: newApp.status,
                  },
                },
              },
            });
          } catch {
            // Non-critical — push notification already sent above
          }
        }
      )
      .subscribe();

    // Check for meeting reminders every minute — DB-backed dedup
    const checkMeetingReminders = async () => {
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      const { data: upcomingMeetings } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          meeting_participants!inner(user_id)
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_start', now.toISOString())
        .lte('scheduled_start', fifteenMinutesFromNow.toISOString())
        .eq('meeting_participants.user_id', user.id);

      if (!upcomingMeetings?.length) return;

      for (const meeting of upcomingMeetings) {
        // DB-backed dedup: check notification_delivery_log
        const { data: alreadySent } = await supabase
          .from('notification_delivery_log')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_type', 'meeting_reminder')
          .eq('event_id', meeting.id)
          .limit(1);

        if (alreadySent && alreadySent.length > 0) continue;

        // Log immediately to prevent duplicates
        await supabase.from('notification_delivery_log').insert({
          user_id: user.id,
          event_type: 'meeting_reminder',
          event_id: meeting.id,
          channel: 'push',
          status: 'sent',
        });

        await notifyMeetingReminder(
          [user.id],
          meeting.title || 'Meeting',
          new Date(meeting.scheduled_start),
          meeting.id
        );

        // Fire orchestrator for SMS/WhatsApp delivery
        try {
          await supabase.functions.invoke('send-candidate-notification', {
            body: {
              user_id: user.id,
              event_type: 'meeting_reminder',
              event_id: meeting.id,
              payload: {
                title: 'Meeting Starting Soon',
                body: `${meeting.title || 'Meeting'} starts at ${new Date(meeting.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                route: `/meetings/${meeting.id}`,
                data: { meetingId: meeting.id },
              },
            },
          });
        } catch {
          // Non-critical
        }
      }
    };

    const meetingInterval = setInterval(checkMeetingReminders, 60000);
    checkMeetingReminders();

    return () => {
      messagesChannel.unsubscribe();
      applicationsChannel.unsubscribe();
      clearInterval(meetingInterval);
    };
  }, [user?.id]);
}
